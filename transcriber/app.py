import os, tempfile
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI(title="Open-source Whisper Transcriber")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CLIENT_ORIGIN", "http://localhost:5173").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
model = None

def get_model():
    global model
    if model is None:
        model = WhisperModel(os.getenv("WHISPER_MODEL", "small"), device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))
    return model

@app.get("/health")
def health(): return {"status": "ok", "model_loaded": model is not None}

async def transcribe_bytes(data: bytes, language: str = "auto"):
    suffix = ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(data); path = f.name
    try:
        lang = None if language in ("auto", "") else language
        segments, info = get_model().transcribe(path, language=lang, beam_size=1, vad_filter=True)
        text = " ".join(s.text.strip() for s in segments).strip()
        return {"text": text, "language": info.language, "language_probability": info.language_probability}
    finally:
        os.unlink(path)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = "auto"):
    result = await transcribe_bytes(await file.read(), language)
    return result

@app.websocket("/ws/transcribe")
async def live_transcribe(ws: WebSocket):
    await ws.accept()
    try:
        # Client sends JSON config first, then WebM audio chunks as binary frames.
        config = await ws.receive_json()
        language = config.get("language", "auto")
        await ws.send_json({"type": "ready"})
        while True:
            data = await ws.receive_bytes()
            if not data: continue
            try:
                result = await transcribe_bytes(data, language)
                if result["text"]:
                    await ws.send_json({"type": "transcript", **result})
            except Exception as exc:
                await ws.send_json({"type": "error", "message": str(exc)})
    except WebSocketDisconnect:
        pass
