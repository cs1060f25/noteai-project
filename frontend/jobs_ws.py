# jobs_ws.py
# Minimal FastAPI app that simulates NoteAI job progress over WebSocket.
import asyncio
import json
import math
import random
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WS Stub")

# Allow Vite dev origin (5173) to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}

@app.websocket("/api/v1/jobs/{job_id}/ws")
async def job_progress_ws(ws: WebSocket, job_id: str):
    await ws.accept()
    try:
        # Simulate progress from 0 to 100
        pct = 0
        # Pick a random start stage to prove mapping works
        stage_seq = ["uploading", "preparing", "generating"]
        while pct < 100:
            # stage by percent
            if pct < 10:
                current_stage = "uploading"
                msg = "Uploading…"
            elif pct < 60:
                current_stage = "preparing"
                msg = random.choice(
                    ["Analyzing audio/layout…", "Detecting silence…", "Transcribing segments…"]
                )
            else:
                current_stage = "generating"
                msg = random.choice(
                    ["Compiling highlights…", "Rendering clips…", "Muxing subtitles…"]
                )

            eta_seconds = max(0, math.ceil((100 - pct) * 0.8))  # rough estimate

            payload = {
                "job_id": job_id,
                "current_stage": current_stage,
                "progress_percent": pct,
                "progress_message": msg,
                "eta_seconds": eta_seconds,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
            await ws.send_text(json.dumps(payload))
            await asyncio.sleep(0.5)
            pct = min(100, pct + random.choice([3, 4, 5, 6, 7]))

        # final completion frame
        payload = {
            "job_id": job_id,
            "current_stage": "completed",
            "progress_percent": 100,
            "progress_message": "Done",
            "eta_seconds": 0,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await ws.send_text(json.dumps(payload))
        await ws.close()
    except WebSocketDisconnect:
        # client closed early — that's fine
        return
    except Exception as e:
        try:
            await ws.send_text(json.dumps({"error": str(e)}))
        finally:
            await ws.close()