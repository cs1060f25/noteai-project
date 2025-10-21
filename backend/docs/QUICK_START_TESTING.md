# Quick Start: Testing Silence Detector

## ✅ Problem Solved!

Your `test_video.mp4` file **has no audio track**, which is why silence detection failed. The silence detector requires audio to analyze.

---

## 🎯 How to Test Right Now

### Option 1: Use the Demo Video (Fastest)

We created a test video with audio for you:

```bash
cd backend
export PATH="/opt/homebrew/bin:$PATH"
uv run python scripts/test_silence_detector_manual.py demo_video.mp4
```

**Expected output:**
```
✅ Analysis complete! Found 0 silence regions
```
(0 regions is correct - it's a continuous tone with no silence)

---

### Option 2: Check Any Video File First

Before testing, check if a video has audio:

```bash
# Check if your video has audio
uv run python scripts/check_video_info.py /path/to/your/video.mp4

# Example output will show:
✅ Audio Track: Present  <-- Good!
❌ Audio Track: Not found  <-- Won't work for silence detection
```

---

### Option 3: Create a Test Video with Silence

Create a video with actual silence periods:

```bash
# This creates a 15-second video with alternating sound and silence
ffmpeg -f lavfi -i color=c=blue:s=640x480:d=15 \
  -f lavfi -i "sine=440:d=3,anullsrc=d=2,sine=880:d=3,anullsrc=d=2,sine=660:d=3,anullsrc=d=2" \
  -shortest -c:v libx264 -pix_fmt yuv420p -c:a aac \
  video_with_silence.mp4 -y

# Then test it
uv run python scripts/test_silence_detector_manual.py video_with_silence.mp4
```

This should detect **3 silence regions** (2 seconds each).

---

### Option 4: Use a Real Lecture Video

For realistic testing:

```bash
# Download a sample lecture video (or use your own)
# Then check if it has audio first
uv run python scripts/check_video_info.py ~/Downloads/lecture.mp4

# If it has audio, test it
uv run python scripts/test_silence_detector_manual.py ~/Downloads/lecture.mp4
```

---

## 🔧 Your Original Video

Your `test_video.mp4` has **NO audio track**. Here's how to fix it:

### Option A: Add Silent Audio Track

```bash
export PATH="/opt/homebrew/bin:$PATH"
ffmpeg -i test_video.mp4 -f lavfi -i anullsrc=r=44100:cl=mono \
  -c:v copy -c:a aac -shortest test_video_with_audio.mp4
```

### Option B: Add Real Audio from Another File

```bash
ffmpeg -i test_video.mp4 -i audio_file.mp3 \
  -c:v copy -c:a aac -shortest test_video_fixed.mp4
```

---

##  Common Issues

### Issue: "No audio track found"

**Cause:** Video file has no audio stream

**Solution:**
1. Check with diagnostics script first: `uv run python scripts/check_video_info.py video.mp4`
2. Use a different video with audio
3. Add audio track using ffmpeg (see above)

### Issue: "0 silence regions detected"

**Cause:** This might be CORRECT! Not all videos have silence.

**Check:**
- Is the audio actually continuous (like music or a constant tone)?
- Try adjusting the threshold in `agents/silence_detector.py`:
  ```python
  SILENCE_THRESH_DBFS = -50  # More sensitive (detects quieter sections)
  MIN_SILENCE_LEN_MS = 300   # Detect shorter silence periods
  ```

---

## 📊 Understanding Results

When silence detection works, you'll see:

```
Region 1:
  Start time: 3.50s
  End time: 5.20s
  Duration: 1.70s
  Type: audio_silence
  Threshold: -40 dBFS

Total silence duration: 8.30s
Total regions: 5
```

This means:
- **5 silence regions** were detected
- **8.3 seconds** of total silence
- Detected at **-40 dBFS** threshold (default)
- Each region shows **when** the silence occurs

---

## 🚀 Next Steps After Successful Testing

1. **Run unit tests:**
   ```bash
   export PATH="/opt/homebrew/bin:$PATH"
   uv run pytest tests/test_silence_detector.py -v
   ```

2. **Test with Docker (full integration):**
   ```bash
   docker-compose up -d
   # Upload video via API (see TESTING_SILENCE_DETECTOR.md)
   ```

3. **Read full documentation:**
   - `docs/TESTING_SILENCE_DETECTOR.md` - Complete testing guide
   - `docs/TROUBLESHOOTING.md` - Common issues and solutions

---

## 💡 Tips

- **Always check videos first** with `scripts/check_video_info.py`
- **Generate test videos** with ffmpeg for controlled testing
- **Adjust parameters** in `silence_detector.py` if needed
- **Check file size** - very large videos take longer to process

---

## ✅ Success Checklist

- [x] ffmpeg installed and in PATH
- [x] Python 3.10+ virtual environment active
- [x] Test video has audio track
- [x] Silence detector runs without errors
- [ ] Unit tests passing
- [ ] Ready for integration testing

**Your current status: Ready to test!** 🎉

Use `demo_video.mp4` or any video file with an audio track.
