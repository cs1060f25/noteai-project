"""Video compilation agent for creating final highlight clips."""

import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import boto3
from sqlalchemy.orm import Session

from agents.utils.ffmpeg_helper import FFmpegHelper
from agents.utils.subtitle_generator import SubtitleGenerator
from app.core.logging import get_logger
from app.core.settings import settings
from app.models.database import Clip, ContentSegment, Job, Transcript

logger = get_logger(__name__)


class CompilationError(Exception):
    """Exception raised for compilation failures."""

    pass


class VideoCompiler:
    """Agent for compiling video segments into final clips."""

    def __init__(self, db: Session) -> None:
        """Initialize video compiler.

        Args:
            db: Database session
        """
        self.db = db
        self.ffmpeg = FFmpegHelper()
        self.subtitle_gen = SubtitleGenerator()
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket_name = settings.s3_bucket_name

    def compile_clips(self, job_id: str) -> dict[str, Any]:
        """Compile video clips from content segments.

        Args:
            job_id: Job identifier

        Returns:
            Result dictionary with compiled clips information

        Raises:
            CompilationError: If compilation fails
        """
        logger.info("Starting video compilation", extra={"job_id": job_id})

        # fetch job
        job = self.db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            raise CompilationError(f"Job not found: {job_id}")

        # fetch content segments ordered by importance
        segments = (
            self.db.query(ContentSegment)
            .filter(ContentSegment.job_id == job_id)
            .order_by(ContentSegment.importance_score.desc())
            .all()
        )

        if not segments:
            raise CompilationError(f"No content segments found for job: {job_id}")

        # fetch all transcripts for subtitle generation
        transcripts = (
            self.db.query(Transcript)
            .filter(Transcript.job_id == job_id)
            .order_by(Transcript.start_time)
            .all()
        )

        compiled_clips = []
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # download original video
            original_video_path = temp_path / "original.mp4"
            try:
                self._download_from_s3(job.original_s3_key, original_video_path)
            except Exception as e:
                raise CompilationError(f"Failed to download from S3: {job.original_s3_key}") from e

            # get video info
            video_info = self.ffmpeg.get_video_info(original_video_path)
            logger.info("Original video info", extra={"job_id": job_id, "info": video_info})

            # process each segment
            for idx, segment in enumerate(segments):
                try:
                    clip_data = self._process_segment(
                        job_id=job_id,
                        segment=segment,
                        original_video_path=original_video_path,
                        temp_path=temp_path,
                        transcripts=transcripts,
                        clip_order=idx,
                        video_info=video_info,
                    )
                    compiled_clips.append(clip_data)
                except Exception as e:
                    logger.error(
                        "Failed to process segment",
                        exc_info=e,
                        extra={"job_id": job_id, "segment_id": segment.segment_id},
                    )
                    # continue with next segment instead of failing entire job
                    continue

        logger.info(
            "Video compilation completed",
            extra={"job_id": job_id, "clips_generated": len(compiled_clips)},
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "clips_generated": len(compiled_clips),
            "clips": compiled_clips,
        }

    def _process_segment(
        self,
        job_id: str,
        segment: ContentSegment,
        original_video_path: Path,
        temp_path: Path,
        transcripts: list[Transcript],
        clip_order: int,
        video_info: dict[str, Any],
    ) -> dict[str, Any]:
        """Process a single content segment into a clip.

        Args:
            job_id: Job identifier
            segment: Content segment to process
            original_video_path: Path to original video
            temp_path: Temporary directory path
            transcripts: List of transcript segments
            clip_order: Order index of the clip
            video_info: Original video information

        Returns:
            Dictionary with clip information
        """
        clip_id = str(uuid.uuid4())
        logger.info(
            "Processing segment",
            extra={
                "job_id": job_id,
                "segment_id": segment.segment_id,
                "clip_id": clip_id,
            },
        )

        # extract segment
        segment_path = temp_path / f"segment_{clip_id}.mp4"
        self.ffmpeg.extract_segment(
            input_path=original_video_path,
            output_path=segment_path,
            start_time=segment.start_time,
            end_time=segment.end_time,
        )

        # determine output resolution
        output_width = min(video_info["width"], 1920)
        output_height = min(video_info["height"], 1080)
        resolution = (output_width, output_height)

        # encode with optimization
        encoded_path = temp_path / f"encoded_{clip_id}.mp4"
        if resolution != (video_info["width"], video_info["height"]):
            self.ffmpeg.transcode_to_resolution(
                input_path=segment_path,
                output_path=encoded_path,
                width=output_width,
                height=output_height,
                bitrate="4M",
            )
        else:
            # if same resolution, just optimize encoding
            encoded_path = segment_path

        # add metadata
        metadata = {
            "title": segment.topic,
            "description": segment.description or "",
            "comment": f"Generated from job {job_id}",
            "creation_time": datetime.now(timezone.utc).isoformat(),
        }

        final_path = temp_path / f"final_{clip_id}.mp4"
        self.ffmpeg.add_metadata(
            video_path=encoded_path,
            output_path=final_path,
            metadata=metadata,
        )

        # generate thumbnail
        thumbnail_path = temp_path / f"thumbnail_{clip_id}.jpg"
        self.ffmpeg.generate_thumbnail(
            video_path=final_path,
            output_path=thumbnail_path,
            timestamp=None,  # middle frame
            size=(1280, 720),
        )

        # generate subtitles
        subtitle_path = temp_path / f"subtitle_{clip_id}.vtt"
        segment_transcripts = self._get_segment_transcripts(
            transcripts, segment.start_time, segment.end_time
        )

        if segment_transcripts:
            self.subtitle_gen.generate_webvtt(
                transcript_segments=segment_transcripts,
                output_path=subtitle_path,
            )

        # upload to s3
        clip_s3_key = f"clips/{job_id}/{clip_id}.mp4"
        thumbnail_s3_key = f"thumbnails/{job_id}/{clip_id}.jpg"
        subtitle_s3_key = f"subtitles/{job_id}/{clip_id}.vtt" if segment_transcripts else None

        self._upload_to_s3(final_path, clip_s3_key, "video/mp4")
        self._upload_to_s3(thumbnail_path, thumbnail_s3_key, "image/jpeg")

        if subtitle_s3_key and subtitle_path.exists():
            self._upload_to_s3(subtitle_path, subtitle_s3_key, "text/vtt")

        # save clip to database
        clip = Clip(
            clip_id=clip_id,
            job_id=job_id,
            content_segment_id=segment.segment_id,
            title=segment.topic,
            topic=segment.topic,
            importance_score=segment.importance_score,
            start_time=segment.start_time,
            end_time=segment.end_time,
            duration=segment.duration,
            s3_key=clip_s3_key,
            thumbnail_s3_key=thumbnail_s3_key,
            subtitle_s3_key=subtitle_s3_key,
            clip_order=clip_order,
            extra_metadata={
                "resolution": f"{output_width}x{output_height}",
                "original_segment_id": segment.segment_id,
            },
        )

        self.db.add(clip)
        self.db.commit()

        logger.info(
            "Clip processed successfully",
            extra={"job_id": job_id, "clip_id": clip_id},
        )

        return {
            "clip_id": clip_id,
            "title": segment.topic,
            "duration": segment.duration,
            "s3_key": clip_s3_key,
            "thumbnail_s3_key": thumbnail_s3_key,
            "subtitle_s3_key": subtitle_s3_key,
        }

    def _get_segment_transcripts(
        self,
        transcripts: list[Transcript],
        start_time: float,
        end_time: float,
    ) -> list[dict[str, Any]]:
        """Get transcripts for a specific segment.

        Args:
            transcripts: All transcripts
            start_time: Segment start time
            end_time: Segment end time

        Returns:
            List of transcript dictionaries adjusted for segment
        """
        transcript_data = [
            {
                "start_time": t.start_time,
                "end_time": t.end_time,
                "text": t.text,
            }
            for t in transcripts
        ]

        return self.subtitle_gen.merge_transcripts_for_segment(
            all_transcripts=transcript_data,
            start_time=start_time,
            end_time=end_time,
        )

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
    compiler = VideoCompiler(db)
    return compiler.compile_clips(job_id)
