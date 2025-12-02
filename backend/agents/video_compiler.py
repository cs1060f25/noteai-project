"""Video compilation agent for creating final highlight clips."""

import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import boto3
from sqlalchemy.orm import Session

from agents.utils.ffmpeg_helper import FFmpegHelper
from app.core.logging import get_logger
from app.core.settings import settings
from app.models.database import Clip, Job
from app.services.storage_service import StorageService

logger = get_logger(__name__)


class CompilationError(Exception):
    """Exception raised for compilation failures."""

    pass


class VideoCompiler:
    """Agent for compiling video segments into final clips."""

    def __init__(self, db: Session, max_workers: int = 2) -> None:
        """Initialize video compiler.
        Args:
            db: Database session
            max_workers: Maximum parallel clip processing workers (default: 2)
        """
        self.db = db
        self.ffmpeg = FFmpegHelper()
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket_name = settings.s3_bucket_name
        self.max_workers = max(1, min(max_workers, 4))  # clamp between 1-4

    def compile_clips(self, job_id: str, local_video_path: str | None = None) -> dict[str, Any]:
        """Compile video clips from Clip records created by segment extractor.
        Args:
            job_id: Job identifier
            local_video_path: Optional local video file path (skips S3 download)
        Returns:
            Result dictionary with compiled clips information
        Raises:
            CompilationError: If compilation fails
        """
        logger.info(
            "Starting video compilation",
            extra={"job_id": job_id, "using_local_path": local_video_path is not None},
        )

        # fetch job
        job = self.db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            raise CompilationError(f"Job not found: {job_id}")

        # fetch clip records created by segment extractor, ordered by clip_order
        clips = self.db.query(Clip).filter(Clip.job_id == job_id).order_by(Clip.clip_order).all()
        if not clips:
            raise CompilationError(
                f"No clips found for job: {job_id}. Run segment extraction first."
            )

        compiled_clips: list[dict[str, Any]] = []
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # use local video path if provided, otherwise download from S3
            if local_video_path and os.path.exists(local_video_path):
                original_video_path = Path(local_video_path)
                logger.info(
                    "Using local video path (optimized pipeline)",
                    extra={"job_id": job_id, "local_path": local_video_path},
                )
            else:
                # fallback to S3 download
                if not job.original_s3_key:
                    raise CompilationError(
                        f"No original S3 key found for job {job_id} and no local path provided"
                    )
                original_video_path = temp_path / "original.mp4"
                try:
                    self._download_from_s3(job.original_s3_key, original_video_path)
                except Exception as e:
                    raise CompilationError(
                        f"Failed to download from S3: {job.original_s3_key}"
                    ) from e

            # get video info
            video_info = self.ffmpeg.get_video_info(original_video_path)
            logger.info("Original video info", extra={"job_id": job_id, "info": video_info})

            # update job with video duration if not already set
            if job.video_duration is None and "duration" in video_info:
                job.video_duration = video_info["duration"]
                self.db.commit()
                logger.info(
                    "Updated job with video duration",
                    extra={"job_id": job_id, "duration": video_info["duration"]},
                )

            # process clips in parallel for major speedup
            if self.max_workers > 1 and len(clips) > 1:
                logger.info(
                    "Processing clips in parallel",
                    extra={"job_id": job_id, "workers": self.max_workers, "clips": len(clips)},
                )
                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    # submit all clip processing tasks
                    future_to_clip = {
                        executor.submit(
                            self._process_clip,
                            job_id,
                            clip,
                            original_video_path,
                            temp_path,
                            video_info,
                        ): clip
                        for clip in clips
                    }

                    # collect results as they complete
                    for future in as_completed(future_to_clip):
                        clip = future_to_clip[future]
                        try:
                            clip_data = future.result()
                            if clip_data:
                                compiled_clips.append(clip_data)
                        except Exception as e:
                            logger.error(
                                "Failed to process clip",
                                exc_info=e,
                                extra={"job_id": job_id, "clip_id": clip.clip_id},
                            )
                            # continue with next clip instead of failing entire job
                            continue
            else:
                # fallback to sequential processing for single clip or max_workers=1
                for clip in clips:
                    try:
                        clip_data = self._process_clip(
                            job_id=job_id,
                            clip=clip,
                            original_video_path=original_video_path,
                            temp_path=temp_path,
                            video_info=video_info,
                        )
                        if clip_data:
                            compiled_clips.append(clip_data)
                    except Exception as e:
                        logger.error(
                            "Failed to process clip",
                            exc_info=e,
                            extra={"job_id": job_id, "clip_id": clip.clip_id},
                        )
                        # continue with next clip instead of failing entire job
                        continue

            # --- batch update database after all parallel processing (thread-safe) ---
            total_clips_size = 0
            if compiled_clips:
                for clip_data in compiled_clips:
                    clip_db_id = clip_data.get("clip_db_id")
                    if clip_db_id:
                        db_clip = self.db.query(Clip).filter(Clip.id == clip_db_id).first()
                        if db_clip:
                            db_clip.s3_key = clip_data["s3_key"]
                            db_clip.file_size_bytes = clip_data.get("file_size_bytes")
                            db_clip.thumbnail_s3_key = clip_data["thumbnail_s3_key"]
                            db_clip.subtitle_s3_key = clip_data.get("subtitle_s3_key")
                            db_clip.extra_metadata = clip_data.get("extra_metadata", {})

                            # track total size for user storage update
                            if clip_data.get("file_size_bytes"):
                                total_clips_size += clip_data["file_size_bytes"]

                self.db.commit()
                logger.info(
                    "Database updated with clip metadata",
                    extra={
                        "job_id": job_id,
                        "clips_updated": len(compiled_clips),
                        "total_clips_bytes": total_clips_size,
                    },
                )

            # create final merged video with transitions
            final_video_path = None
            final_video_s3_key = None

            try:
                if len(compiled_clips) > 1:
                    # Merge all final clips with crossfade transitions
                    segment_paths = [
                        temp_path / f"final_{clip['clip_id']}.mp4" for clip in compiled_clips
                    ]
                    # use cached durations to avoid re-probing segments
                    segment_durations = [clip["duration"] for clip in compiled_clips]
                    final_video_path = temp_path / f"final_{job_id}.mp4"

                    self.ffmpeg.concatenate_with_transitions(
                        segments=segment_paths,
                        output_path=final_video_path,
                        transition_duration=0.5,
                        resolution=(
                            min(video_info["width"], 1920),
                            min(video_info["height"], 1080),
                        ),
                        segment_durations=segment_durations,
                    )

                    logger.info(
                        "Applied smooth transitions between clips", extra={"job_id": job_id}
                    )

                elif len(compiled_clips) == 1:
                    # Only one clip — use it as the final video
                    final_video_path = temp_path / f"final_{compiled_clips[0]['clip_id']}.mp4"

                # Upload final merged video to S3
                if final_video_path and final_video_path.exists():
                    final_video_s3_key = f"highlights/{job_id}/final.mp4"
                    self._upload_to_s3(final_video_path, final_video_s3_key, "video/mp4")
                    logger.info(
                        "Uploaded final merged video to S3",
                        extra={"job_id": job_id, "s3_key": final_video_s3_key},
                    )

                    # Update job record with final video S3 key
                    job.compiled_video_s3_key = final_video_s3_key
                    self.db.commit()
                    logger.info("Updated job with final video S3 key", extra={"job_id": job_id})

            except Exception as e:
                logger.error(
                    "Failed to create or upload final merged video",
                    exc_info=e,
                    extra={"job_id": job_id},
                )

            # update user storage tracking
            if total_clips_size > 0 and job.user_id:
                try:
                    storage_service = StorageService(self.db)
                    storage_service.increment_user_storage(job.user_id, total_clips_size)
                    logger.info(
                        "Updated user storage",
                        extra={
                            "job_id": job_id,
                            "user_id": job.user_id,
                            "clips_size_bytes": total_clips_size,
                        },
                    )
                except Exception as e:
                    logger.error(
                        "Failed to update user storage",
                        exc_info=e,
                        extra={"job_id": job_id, "user_id": job.user_id},
                    )

        # commit result summary
        logger.info(
            "Video compilation completed",
            extra={"job_id": job_id, "clips_generated": len(compiled_clips)},
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "clips_generated": len(compiled_clips),
            "clips": compiled_clips,
            "final_video_s3_key": final_video_s3_key,
        }

    def _process_clip(
        self,
        job_id: str,
        clip: Clip,
        original_video_path: Path,
        temp_path: Path,
        video_info: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Process a Clip record into actual video file with thumbnail.

        Thread-safe: Does NOT commit to database. Returns data for batch update.

        Args:
            job_id: Job identifier
            clip: Clip record from database (created by segment extractor)
            original_video_path: Path to original video file
            temp_path: Temporary directory path
            video_info: Video metadata dict

        Returns:
            Clip metadata dictionary with DB update fields, or None if the clip is invalid.
        """
        clip_id = clip.clip_id
        logger.info(
            "Processing clip",
            extra={
                "job_id": job_id,
                "clip_id": clip_id,
                "start_time": clip.start_time,
                "end_time": clip.end_time,
            },
        )

        # --- validate and clamp clip times ---
        video_duration = float(video_info.get("duration", 0))
        start_time = max(0.0, float(clip.start_time))
        end_time = min(float(clip.end_time), video_duration)

        # skip invalid or zero-length clips
        if end_time <= start_time or start_time >= video_duration:
            logger.warning(
                f"Skipping clip {clip_id}: "
                f"invalid time range ({start_time:.2f}-{end_time:.2f}s) "
                f"for video length {video_duration:.2f}s"
            )
            return None

        output_width = min(video_info["width"], 1920)
        output_height = min(video_info["height"], 1080)

        # --- prepare metadata ---
        metadata = {
            "title": clip.title or f"Clip {clip.clip_order}",
            "description": clip.topic or "",
            "comment": f"Generated from job {job_id}",
            "creation_time": datetime.now(timezone.utc).isoformat(),
        }
        # --- extract + transcode + metadata in ONE ffmpeg pass (3x faster!) ---
        final_path = temp_path / f"final_{clip_id}.mp4"
        
        # FORCE RE-ENCODE: We always pass resolution to force re-encoding.
        # This is critical because "copy" mode (without re-encoding) snaps to keyframes,
        # causing the actual start time to drift from the requested start time.
        # This drift causes subtitles to be out of sync.
        self.ffmpeg.extract_and_process_segment(
            input_path=original_video_path,
            output_path=final_path,
            start_time=start_time,
            end_time=end_time,
            resolution=(output_width, output_height),
            metadata=metadata,
        )

        # --- generate thumbnail ---
        thumbnail_path = temp_path / f"thumbnail_{clip_id}.jpg"
        self.ffmpeg.generate_thumbnail(
            video_path=final_path,
            output_path=thumbnail_path,
            timestamp=None,
            size=(1280, 720),
        )

        # --- generate subtitle file from transcripts ---
        subtitle_s3_key = None
        subtitle_path = temp_path / f"subtitle_{clip_id}.vtt"

        try:
            from agents.utils.subtitle_helper import generate_vtt_from_transcripts
            from app.models.database import Transcript

            # Query transcripts within clip time range
            transcripts = (
                self.db.query(Transcript)
                .filter(
                    Transcript.job_id == job_id,
                    Transcript.end_time > start_time,
                    Transcript.start_time < end_time,
                )
                .order_by(Transcript.start_time)
                .all()
            )

            if transcripts:
                # Generate VTT file with clip-relative timestamps
                success = generate_vtt_from_transcripts(
                    transcripts=transcripts,
                    clip_start_time=start_time,
                    clip_end_time=end_time,
                    output_path=subtitle_path,
                )

                if success and subtitle_path.exists():
                    # Upload subtitle to S3
                    subtitle_s3_key = f"subtitles/{job_id}/{clip_id}.vtt"
                    self._upload_to_s3(subtitle_path, subtitle_s3_key, "text/vtt")

                    logger.info(
                        "Subtitle generated",
                        extra={
                            "job_id": job_id,
                            "clip_id": clip_id,
                            "transcript_segments": len(transcripts),
                        },
                    )
            else:
                logger.debug(
                    "No transcripts found for clip",
                    extra={"job_id": job_id, "clip_id": clip_id},
                )

        except Exception as e:
            # Subtitle generation is non-critical - log and continue
            logger.warning(
                "Subtitle generation failed, continuing without subtitles",
                exc_info=e,
                extra={"job_id": job_id, "clip_id": clip_id},
            )

        # --- upload assets to S3 ---
        clip_s3_key = f"clips/{job_id}/{clip_id}.mp4"
        thumbnail_s3_key = f"thumbnails/{job_id}/{clip_id}.jpg"

        self._upload_to_s3(final_path, clip_s3_key, "video/mp4")
        self._upload_to_s3(thumbnail_path, thumbnail_s3_key, "image/jpeg")

        # get file size of the compiled clip
        clip_file_size = os.path.getsize(final_path)

        # --- prepare DB update data (no commit here - thread-safe) ---
        extra_metadata = clip.extra_metadata or {}
        extra_metadata["resolution"] = f"{output_width}x{output_height}"
        extra_metadata["compiled_at"] = datetime.now(timezone.utc).isoformat()

        logger.info(
            "Clip processed successfully",
            extra={"job_id": job_id, "clip_id": clip_id, "file_size_bytes": clip_file_size},
        )

        # return data for batch DB update
        return {
            "clip_id": clip_id,
            "clip_db_id": clip.id,  # database primary key for update
            "title": clip.title,
            "duration": clip.duration,
            "s3_key": clip_s3_key,
            "file_size_bytes": clip_file_size,
            "thumbnail_s3_key": thumbnail_s3_key,
            "subtitle_s3_key": subtitle_s3_key,
            "extra_metadata": extra_metadata,
        }

    def _download_from_s3(self, s3_key: str, local_path: Path) -> None:
        """Download file from S3.
        Args:
            s3_key: S3 object key
            local_path: Local file path to save to
        Raises:
            CompilationError: If download fails
        """
        try:
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path),
            )
            logger.info("Downloaded from S3", extra={"s3_key": s3_key})
        except Exception as e:
            logger.error(
                "Failed to download from S3",
                exc_info=e,
                extra={"s3_key": s3_key},
            )
            raise CompilationError(
                f"Failed to download from S3: {s3_key}"
            ) from e  # 👈 ADD "from e"

    def _upload_to_s3(self, local_path: Path, s3_key: str, content_type: str) -> None:
        """Upload file to S3.
        Args:
            local_path: Local file path
            s3_key: S3 object key
            content_type: MIME type
        Raises:
            CompilationError: If upload fails
        """
        try:
            self.s3_client.upload_file(
                str(local_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={"ContentType": content_type},
            )
            logger.info("Uploaded to S3", extra={"s3_key": s3_key})
        except Exception as e:
            logger.error(
                "Failed to upload to S3",
                exc_info=e,
                extra={"s3_key": s3_key},
            )
            raise CompilationError(f"Failed to upload to S3: {s3_key}") from e


def compile_video_clips(job_id: str, db: Session) -> dict[str, Any]:
    """Main entry point for video compilation.
    Args:
        job_id: Job identifier
        db: Database session
    Returns:
        Compilation result dictionary
    """
    compiler = VideoCompiler(db, max_workers=settings.video_compilation_max_workers)
    return compiler.compile_clips(job_id)


def compile_clips(job_id: str, db: Session) -> dict[str, Any]:
    return compile_video_clips(job_id, db)
