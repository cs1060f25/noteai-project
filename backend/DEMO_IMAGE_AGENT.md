# Image Agent Demonstration

This guide shows you how to see the **Image Agent in action**, extracting visual content from video frames using Gemini Vision API.

## What This Demo Does

The demonstration script (`demo_image_agent.py`) shows the core functionality of the Image Agent:

1. **Extracts sample frames** from a video at 25%, 50%, and 75% timestamps
2. **Analyzes each frame** using Gemini Vision API (same as production pipeline)
3. **Extracts visual content**:
   - Text blocks (titles, bullet points, equations, labels)
   - Visual elements (diagrams, charts, graphics)
   - Key concepts (main topics shown visually)
4. **Displays results** in a clear, formatted output

This is the **exact same Gemini Vision analysis** that runs in the production pipeline, just isolated for demonstration.

## Prerequisites

1. **Install backend dependencies** (this already includes everything needed):
   ```bash
   cd backend
   uv pip install -e ".[dev]"
   ```

2. **Gemini API key** configured in your `.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **A video file** to analyze (preferably an educational video with slides)

## How to Run

### Basic Usage

Make sure you're using the virtual environment Python:

```bash
cd backend
python3 demo_image_agent.py <path_to_video_file>
```

Or if using uv:
```bash
cd backend
uv run demo_image_agent.py <path_to_video_file>
```

### Example with a Test Video

If you have a test lecture video:

```bash
python demo_image_agent.py /path/to/lecture_video.mp4
```

### What You'll See

The script will output:

```
================================================================================
IMAGE AGENT DEMONSTRATION
================================================================================

📹 Video: /path/to/lecture_video.mp4

✅ Gemini API configured

📊 Video Information:
   Resolution: 1920x1080
   FPS: 30.00
   Duration: 120.50 seconds
   Total frames: 3615

🎯 Extracting and analyzing sample frames...

Frame 1/3 at 30.1s:
------------------------------------------------------------
✅ Frame extracted: 1920x1080 pixels
🤖 Calling Gemini Vision API...
✅ Analysis completed in 2.34s

📝 TEXT BLOCKS:
   • Introduction to Neural Networks
   • Backpropagation Algorithm
   • Gradient Descent

🎨 VISUAL ELEMENTS:
   • diagram
   • flowchart
   • equation

💡 KEY CONCEPTS:
   • neural networks
   • backpropagation
   • gradient descent

[... more frames ...]

================================================================================
SUMMARY
================================================================================

✅ Analyzed 3 frames from video
📊 Total text blocks extracted: 15
🎨 Total visual elements detected: 8
💡 Total key concepts identified: 12

🎨 Unique visual elements across all frames:
   • diagram
   • flowchart
   • equation
   • chart

💡 Unique key concepts across all frames:
   • neural networks
   • backpropagation
   • gradient descent
   • deep learning

✅ Image Agent demonstration complete!
```

## Understanding the Output

### 📝 TEXT BLOCKS
All visible text detected in the slide/frame:
- Slide titles
- Bullet points
- Equations
- Labels and annotations

### 🎨 VISUAL ELEMENTS
Types of visual content detected:
- `diagram` - Technical diagrams
- `chart` - Bar charts, pie charts, etc.
- `equation` - Mathematical equations
- `flowchart` - Process flow diagrams
- `table` - Data tables
- `graph` - Line graphs, scatter plots

### 💡 KEY CONCEPTS
Main topics/concepts identified visually:
- Subject matter keywords
- Technical terms shown in slides
- Topics being explained

## How This Relates to Production Pipeline

In the production pipeline ([pipeline/tasks.py:1093-1119](pipeline/tasks.py#L1093-L1119)):

1. **Layout Detector** runs first, identifying screen/camera regions
2. **Image Agent** (`extract_slide_content`) runs next:
   - Uses layout info to focus on screen region only
   - Samples frames every 5 seconds (max 10 frames)
   - Calls Gemini Vision API (same as demo)
   - Stores results in `SlideContent` database table
3. **Content Analyzer** uses visual content to enhance segment creation

This demo script shows **step 2** in isolation, so you can see the Image Agent extracting visual content.

## Troubleshooting

### Error: "GEMINI_API_KEY not configured"
**Solution**: Make sure your `.env` file contains:
```
GEMINI_API_KEY=your_actual_api_key
```

Then restart your terminal or reload environment variables.

### Error: "Failed to open video"
**Solution**:
- Check the video file path is correct
- Ensure the video file is readable
- Try with a different video format (MP4 recommended)

### Error: "No module named 'cv2'"
**Solution**: Install OpenCV:
```bash
pip install opencv-python
```

### Error: "No module named 'google.generativeai'"
**Solution**: Install the Gemini SDK:
```bash
pip install google-generativeai
```

## Next Steps

After seeing the Image Agent in action:

1. **Review the full implementation** in [agents/image_agent.py](agents/image_agent.py)
2. **Check the database model** in [app/models/database.py](app/models/database.py) (SlideContent)
3. **See pipeline integration** in [pipeline/tasks.py:1093-1119](pipeline/tasks.py#L1093-L1119)
4. **View Content Analyzer enhancement** in [agents/content_analyzer.py](agents/content_analyzer.py)

## Questions?

- **Where is the Image Agent code?** → [agents/image_agent.py](agents/image_agent.py)
- **How is it integrated?** → [pipeline/tasks.py:1093-1119](pipeline/tasks.py#L1093-L1119)
- **Where is visual content stored?** → `SlideContent` table ([app/models/database.py](app/models/database.py))
- **How does Content Analyzer use it?** → [agents/content_analyzer.py:465-489](agents/content_analyzer.py#L465-L489)
