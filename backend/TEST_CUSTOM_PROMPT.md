# Testing Custom AI Instructions Integration

This guide helps verify that user-provided AI instructions are actually being used by the Gemini API during content analysis.

## Quick Test

### 1. Upload a Video with a Specific, Verifiable Prompt

Use one of these test prompts that will produce obvious, verifiable results:

#### Test 1: Keyword Injection Test (RECOMMENDED)
```
Focus on any educational content. Include the exact phrase "CUSTOM_TEST_KEYWORD_12345" in the keywords list of EVERY segment you identify.
```

**Expected Result:** Every segment should have "CUSTOM_TEST_KEYWORD_12345" in its keywords.

#### Test 2: Math-Only Test
```
ONLY extract segments that contain mathematical equations, formulas, or numerical calculations. Completely ignore all other content including introductions, conclusions, and non-mathematical discussions.
```

**Expected Result:** All segments should be about math, with keywords like: equation, formula, calculation, theorem, etc.

#### Test 3: High Score Test
```
Rate ALL segments with importance_score of 0.9 or higher. Everything in this lecture is critically important.
```

**Expected Result:** Average importance_score should be ≥ 0.9

#### Test 4: Topic Prefix Test
```
Add the prefix "CUSTOM: " to the beginning of every segment topic you create.
```

**Expected Result:** All segment topics should start with "CUSTOM: "

### 2. Monitor the Logs

Look for these log messages in your Celery worker output:

```
[INFO] Using custom AI instructions
[INFO] Prompt built for Gemini API
  - has_custom_instructions: true
  - prompt_preview: (should show your custom instructions)
```

### 3. Run the Test Script

After the video finishes processing, run:

```bash
cd backend
python test_custom_prompt_integration.py <job_id> CUSTOM_TEST_KEYWORD_12345
```

Replace `<job_id>` with your actual job ID.

### 4. Check the Results

The script will show:
- ✅ Whether custom prompt was found in job metadata
- ✅ Content segments and their keywords
- ✅ Whether your expected keyword appears

## Detailed Verification Steps

### Step 1: Upload Video with Custom Prompt

1. Go to the upload page
2. Enter one of the test prompts above in "AI Instructions"
3. Upload a test video (any educational content)
4. Note the job ID from the URL or response

### Step 2: Check Logs for Prompt Integration

**Look for this in logs:**
```
[INFO] content analysis started
[INFO] Using custom AI instructions
  - job_id: <your-job-id>
  - prompt_preview: Focus on any educational content. Include the exact phrase "CUSTOM_TEST_KEYWORD_12345"...
```

**Then look for:**
```
[INFO] Prompt built for Gemini API
  - job_id: <your-job-id>
  - prompt_length: <number>
  - has_custom_instructions: true
  - prompt_preview: You are analyzing an educational lecture transcript...
                    USER INSTRUCTIONS (High Priority):
                    <your custom prompt should appear here>
```

### Step 3: Verify in Database

```sql
-- Check job metadata
SELECT
    job_id,
    filename,
    extra_metadata->'processing_config'->>'prompt' as custom_prompt
FROM jobs
WHERE job_id = '<your-job-id>';

-- Check generated segments
SELECT
    topic,
    importance_score,
    keywords
FROM content_segments
WHERE job_id = '<your-job-id>'
ORDER BY start_time;
```

### Step 4: Analyze Results

Run the test script:
```bash
python test_custom_prompt_integration.py <job_id> CUSTOM_TEST_KEYWORD_12345
```

Expected output if working:
```
✅ Custom prompt found:
   Length: 145 characters
   Preview: Focus on any educational content. Include the exact phrase "CUSTOM_TEST_KEYWORD_12345"...

✅ Content segments found: 8

  Searching for expected keyword: 'CUSTOM_TEST_KEYWORD_12345'
  ✅ FOUND! Custom instructions were used!
```

## Troubleshooting

### Issue: Logs show "Using default AI instructions"

**Cause:** Custom prompt is not being retrieved.

**Check:**
1. Verify job metadata has `processing_config.prompt`:
   ```bash
   python test_custom_prompt_integration.py <job_id>
   ```

2. Check if prompt was sent in upload request (check frontend console/network tab)

### Issue: Logs show "Using custom AI instructions" but segments don't reflect it

**Cause:** Prompt may not be formatted correctly or Gemini is ignoring it.

**Check:**
1. Look for the "Prompt built for Gemini API" log entry
2. Verify the `prompt_preview` contains your custom instructions
3. Check if "USER INSTRUCTIONS (High Priority):" section appears in the preview

**Debug:**
```python
# In content_analyzer.py, temporarily add:
logger.info(f"FULL PROMPT:\n{prompt}")  # See entire prompt
```

### Issue: Expected keyword not found in results

**Possible causes:**
1. **Gemini ignored instructions:** The AI model sometimes doesn't follow instructions exactly
2. **Prompt not reaching Gemini:** Check logs for "Prompt built for Gemini API"
3. **Instructions conflicting with output format:** Try simpler instructions

**Solutions:**
- Use more explicit, directive language: "You MUST include..."
- Make instructions about content selection rather than output formatting
- Try the "Math-Only Test" instead (easier to verify)

## Test Results Interpretation

### ✅ Integration Working If:
- Log shows "Using custom AI instructions" with your prompt preview
- "Prompt built for Gemini API" shows `has_custom_instructions: true`
- Segment results reflect your instructions (e.g., keyword found, topics match focus)
- Test script reports "✅ FOUND! Custom instructions were used!"

### ❌ Integration NOT Working If:
- Log shows "Using default AI instructions" when you provided one
- "Prompt built for Gemini API" shows `has_custom_instructions: false`
- No "USER INSTRUCTIONS" section in prompt preview
- Segments completely ignore your instructions

### ⚠️ Partial/Unclear If:
- Log shows custom instructions but results don't clearly match
- This could be Gemini interpretation issues, not integration issues
- Try more explicit test prompts (like keyword injection)

## Advanced Testing

### Test with Multiple Videos

Upload 3 videos:
1. No custom prompt (control)
2. "Focus only on mathematical content"
3. "Focus only on code examples"

Compare the segment keywords across all three.

### Test with Parallel Processing

Upload a long video (>20 minutes) to trigger chunked analysis.
Check logs for: `"Using PARALLEL content analysis"`
Verify each chunk receives the custom instructions.

### Test Prompt Length Limits

Try prompts of different lengths:
- Short (50 chars)
- Medium (500 chars)
- Long (1900 chars, near 2000 limit)

Verify all work correctly.

## Suggested Test Prompts

Run this to see more test ideas:
```bash
python test_custom_prompt_integration.py --suggest
```

## Success Criteria

✅ Custom prompt retrieved from database
✅ Custom prompt logged in "Using custom AI instructions"
✅ Prompt includes "USER INSTRUCTIONS (High Priority):" section
✅ Gemini receives the full prompt with custom instructions
✅ Generated segments reflect the custom instructions
✅ Test keyword appears in results when requested
✅ No errors or warnings in logs

## Report Issues

If the integration is not working:

1. Collect:
   - Job ID
   - Custom prompt used
   - Relevant log excerpts
   - Test script output
   - Expected vs actual results

2. Check the actual Gemini prompt being sent (add full logging temporarily)

3. Verify the issue is with integration, not Gemini's interpretation
