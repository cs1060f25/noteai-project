#!/usr/bin/env python3
"""Test script to verify custom AI instructions are integrated in content analysis.

This script helps verify that user-provided AI instructions are actually
being used by the Gemini API during content analysis.
"""

import json
import sys
from pathlib import Path

# add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.settings import settings
from app.services.db_service import DatabaseService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def get_db_session():
    """Create database session."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def test_prompt_retrieval(job_id: str):
    """Test that we can retrieve the custom prompt from a job.

    Args:
        job_id: Job ID to test
    """
    print(f"\n{'='*60}")
    print(f"Testing Custom Prompt Integration for Job: {job_id}")
    print(f"{'='*60}\n")

    db = get_db_session()
    try:
        db_service = DatabaseService(db)
        job = db_service.jobs.get_by_id(job_id)

        if not job:
            print(f"❌ Job not found: {job_id}")
            return False

        print(f"✅ Job found: {job.filename}")
        print(f"   Status: {job.status}")
        print(f"   Stage: {job.current_stage}")

        # check for processing config
        if not job.extra_metadata:
            print("\n❌ No extra_metadata found")
            return False

        processing_config = job.extra_metadata.get("processing_config", {})
        if not processing_config:
            print("\n❌ No processing_config in extra_metadata")
            return False

        print("\n✅ Processing config found:")
        print(f"   {json.dumps(processing_config, indent=2)}")

        # check for custom prompt
        custom_prompt = processing_config.get("prompt")
        if not custom_prompt:
            print("\n⚠️  No custom prompt found (this is OK if user didn't provide one)")
            return True

        print("\n✅ Custom prompt found:")
        print(f"   Length: {len(custom_prompt)} characters")
        print(f"   Preview: {custom_prompt[:200]}...")

        # check content segments to see if they reflect the prompt
        segments = db_service.content_segments.get_by_job_id(job_id)
        if segments:
            print(f"\n✅ Content segments found: {len(segments)}")
            print("\n   Top 3 segments:")
            for i, seg in enumerate(segments[:3], 1):
                print(f"   {i}. {seg.topic}")
                print(f"      Score: {seg.importance_score:.2f}")
                print(f"      Keywords: {', '.join(seg.keywords[:5])}")
        else:
            print("\n⚠️  No content segments found yet (job may still be processing)")

        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def check_processing_logs(job_id: str):
    """Check processing logs for evidence of custom prompt usage.

    Args:
        job_id: Job ID to check
    """
    db = get_db_session()
    try:
        db_service = DatabaseService(db)
        logs = db_service.processing_logs.get_by_job_id(job_id)

        print(f"\n{'='*60}")
        print(f"Processing Logs for Job: {job_id}")
        print(f"{'='*60}\n")

        if not logs:
            print("❌ No processing logs found")
            return

        print(f"✅ Found {len(logs)} log entries:\n")
        for log in logs:
            status_emoji = "✅" if log.status == "completed" else "⏳" if log.status == "started" else "❌"
            print(f"{status_emoji} {log.stage} - {log.agent_name}: {log.status}")
            if log.details:
                print(f"   Details: {log.details}")

    finally:
        db.close()


def suggest_test_prompts():
    """Suggest specific test prompts that produce verifiable results."""
    print(f"\n{'='*60}")
    print("Suggested Test Prompts for Verification")
    print(f"{'='*60}\n")

    tests = [
        {
            "name": "Math Focus Test",
            "prompt": "ONLY extract segments that contain mathematical equations, formulas, or numerical calculations. Ignore all other content.",
            "verification": "Check if all segments have math-related keywords (equation, formula, calculation, etc.)",
        },
        {
            "name": "Code Example Test",
            "prompt": "Extract ONLY segments where code is being written or explained. Focus on programming examples and ignore theory.",
            "verification": "Check if segments have keywords like: code, function, variable, programming, etc.",
        },
        {
            "name": "High Score Test",
            "prompt": "Rate ALL segments with importance_score above 0.8. Everything is critical.",
            "verification": "Check if average importance_score is above 0.8",
        },
        {
            "name": "Keyword Test",
            "prompt": "Focus on segments discussing 'machine learning' and 'neural networks'. Include the exact phrase 'CUSTOM_TEST_KEYWORD_12345' in all keywords lists.",
            "verification": "Check if 'CUSTOM_TEST_KEYWORD_12345' appears in keywords",
        },
    ]

    for i, test in enumerate(tests, 1):
        print(f"{i}. {test['name']}")
        print(f"   Prompt: \"{test['prompt']}\"")
        print(f"   Verification: {test['verification']}")
        print()


def analyze_segment_keywords(job_id: str, expected_keyword: str = None):
    """Analyze segment keywords to verify custom instructions were followed.

    Args:
        job_id: Job ID to analyze
        expected_keyword: Optional keyword to search for
    """
    print(f"\n{'='*60}")
    print(f"Keyword Analysis for Job: {job_id}")
    print(f"{'='*60}\n")

    db = get_db_session()
    try:
        db_service = DatabaseService(db)
        segments = db_service.content_segments.get_by_job_id(job_id)

        if not segments:
            print("❌ No segments found")
            return

        print(f"✅ Analyzing {len(segments)} segments\n")

        # collect all keywords
        all_keywords = []
        importance_scores = []

        for seg in segments:
            all_keywords.extend(seg.keywords)
            importance_scores.append(seg.importance_score)

        # statistics
        avg_score = sum(importance_scores) / len(importance_scores)
        unique_keywords = set(all_keywords)

        print("Statistics:")
        print(f"  Total segments: {len(segments)}")
        print(f"  Average importance score: {avg_score:.3f}")
        print(f"  Total keywords: {len(all_keywords)}")
        print(f"  Unique keywords: {len(unique_keywords)}")

        # most common keywords
        from collections import Counter
        keyword_counts = Counter(all_keywords)
        print("\n  Top 10 keywords:")
        for keyword, count in keyword_counts.most_common(10):
            print(f"    - {keyword}: {count}")

        # check for expected keyword
        if expected_keyword:
            print(f"\n  Searching for expected keyword: '{expected_keyword}'")
            if expected_keyword.lower() in [k.lower() for k in all_keywords]:
                print("  ✅ FOUND! Custom instructions were used!")
            else:
                print("  ❌ NOT FOUND! Custom instructions may not be working!")

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_custom_prompt_integration.py <job_id> [expected_keyword]")
        print("\nOr: python test_custom_prompt_integration.py --suggest")
        print("    to see suggested test prompts")
        sys.exit(1)

    if sys.argv[1] == "--suggest":
        suggest_test_prompts()
        sys.exit(0)

    job_id = sys.argv[1]
    expected_keyword = sys.argv[2] if len(sys.argv) > 2 else None

    # run tests
    test_prompt_retrieval(job_id)
    check_processing_logs(job_id)
    analyze_segment_keywords(job_id, expected_keyword)

    print(f"\n{'='*60}")
    print("Test Complete")
    print(f"{'='*60}\n")
