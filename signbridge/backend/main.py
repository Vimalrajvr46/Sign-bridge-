"""SignBridge FastAPI application entry point."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from auth import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
    require_user,
)
from avatar_service import avatar_service
from config import get_settings
from room_service import room_service
from sign_detection import sign_detection_service
from speech_service import speech_service
from translation_service import translation_service
from websocket_manager import MessageType, generate_client_id, ws_manager

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
settings = get_settings()
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(settings.logs_dir / "signbridge.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("signbridge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    yield
    logger.info("Shutting down SignBridge")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered real-time communication platform for Deaf/Hearing users",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve animation assets if directory exists
animations_path = Path(__file__).resolve().parent.parent / "frontend" / "src" / "assets" / "animations"
if animations_path.exists():
    app.mount("/animations", StaticFiles(directory=str(animations_path)), name="animations")


# ---------------------------------------------------------------------------
# Health & Info
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
    }


@app.get(f"{settings.api_prefix}/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
@app.post(f"{settings.api_prefix}/auth/register", response_model=UserResponse)
async def api_register(user: UserCreate):
    return register_user(user)


@app.post(f"{settings.api_prefix}/auth/login", response_model=TokenResponse)
async def api_login(credentials: UserLogin):
    user = authenticate_user(credentials)
    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, user=user)


@app.get(f"{settings.api_prefix}/auth/me", response_model=UserResponse)
async def api_me(user: UserResponse = Depends(require_user)):
    return user


@app.get(f"{settings.api_prefix}/auth/me/optional")
async def api_me_optional(user: UserResponse | None = Depends(get_current_user)):
    return user or {"anonymous": True}


# ---------------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------------
@app.post(f"{settings.api_prefix}/rooms")
async def create_room(host_name: str = "Host"):
    room = room_service.create_room(host_name=host_name)
    return room


@app.get(f"{settings.api_prefix}/rooms/{{room_id}}")
async def get_room(room_id: str):
    room = room_service.get_room(room_id)
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@app.post(f"{settings.api_prefix}/rooms/{{room_id}}/join")
async def join_room(room_id: str):
    try:
        return room_service.join_room(room_id)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# AI Services — REST endpoints
# ---------------------------------------------------------------------------
@app.post(f"{settings.api_prefix}/speech/transcribe")
async def transcribe_speech(
    language: str = "en",
    # In production, accept UploadFile; here we accept base64 in body
):
    return {"message": "Use WebSocket for streaming speech. POST audio bytes to /speech/transcribe-bytes"}


@app.post(f"{settings.api_prefix}/speech/transcribe-bytes")
async def transcribe_bytes(request: Request, language: str = "en"):
    body = await request.body()
    result = speech_service.transcribe(body, language=language)
    gesture = speech_service.map_to_avatar_gesture(result["text"])
    avatar_msg = avatar_service.build_avatar_message(result["text"])
    return {**result, "gesture": gesture, "avatar": avatar_msg}


@app.post(f"{settings.api_prefix}/translation/translate")
async def translate_text(
    text: str,
    source_lang: str = "en",
    target_lang: str = "en",
):
    return translation_service.translate(text, source_lang, target_lang)


@app.get(f"{settings.api_prefix}/translation/languages")
async def get_languages():
    return {"languages": translation_service.get_supported_languages()}


@app.post(f"{settings.api_prefix}/translation/predict")
async def predict_sentence(context: str, count: int = 3):
    return {"predictions": translation_service.predict_next_words(context, count)}


@app.post(f"{settings.api_prefix}/sign/detect")
async def detect_sign(request: Request):
    body = await request.body()
    return sign_detection_service.process_frame(body)


@app.get(f"{settings.api_prefix}/sign/vocabulary")
async def sign_vocabulary():
    return {"vocabulary": sign_detection_service.get_vocabulary()}


@app.post(f"{settings.api_prefix}/avatar/message")
async def build_avatar_message(text: str, translated_text: str | None = None):
    return avatar_service.build_avatar_message(text, translated_text)


@app.get(f"{settings.api_prefix}/avatar/config")
async def avatar_config():
    return avatar_service.get_avatar_config_options()


# ---------------------------------------------------------------------------
# WebSocket — Signaling + Real-time messaging
# ---------------------------------------------------------------------------
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    client_id = generate_client_id()
    role = "hearing"
    display_name = "Guest"
    language = "en"
    avatar_config: dict = {}

    await websocket.accept()
    room_id = room_id.upper()

    try:
        init_data = await websocket.receive_json()
        role = init_data.get("role", "hearing")
        display_name = init_data.get("display_name", "Guest")
        language = init_data.get("language", "en")
        avatar_config = init_data.get("avatar_config", {})
        client_id = init_data.get("client_id", client_id)
    except Exception:
        logger.warning("WebSocket init message missing for room %s", room_id)

    from websocket_manager import Participant, Room

    if room_id not in ws_manager.rooms:
        ws_manager.rooms[room_id] = Room(room_id=room_id)
    ws_manager.rooms[room_id].participants[client_id] = Participant(
        client_id=client_id,
        websocket=websocket,
        role=role,
        display_name=display_name,
        language=language,
        avatar_config=avatar_config,
    )

    await ws_manager.broadcast(
        room_id,
        {
            "type": MessageType.JOIN,
            "client_id": client_id,
            "display_name": display_name,
            "role": role,
            "language": language,
            "participants": ws_manager.get_participant_list(room_id),
        },
        exclude=client_id,
    )
    await ws_manager.send_personal(
        client_id,
        room_id,
        {
            "type": MessageType.JOIN,
            "client_id": client_id,
            "room_id": room_id,
            "participants": ws_manager.get_participant_list(room_id),
            "history": ws_manager.get_history(room_id, limit=50),
        },
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            # Process speech through AI pipeline
            if msg_type == MessageType.SPEECH and data.get("text"):
                text = data["text"]
                source_lang = data.get("source_lang", "en")
                target_lang = data.get("target_lang", language)

                translation = translation_service.translate(text, source_lang, target_lang)
                avatar_msg = avatar_service.build_avatar_message(
                    text, translation["translated"]
                )

                caption_msg = {
                    "type": MessageType.CAPTION,
                    "from": client_id,
                    "text": text,
                    "translated": translation["translated"],
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                }
                ws_manager.append_history(room_id, caption_msg)
                await ws_manager.broadcast(room_id, caption_msg, exclude=client_id)
                await ws_manager.broadcast(room_id, {**avatar_msg, "from": client_id})
                continue

            # Process sign recognition
            if msg_type == MessageType.SIGN and data.get("frame_base64"):
                import base64
                frame_bytes = base64.b64decode(data["frame_base64"])
                sign_result = sign_detection_service.process_frame(frame_bytes)
                if sign_result.get("text"):
                    target_lang = data.get("target_lang", "en")
                    translation = translation_service.translate(
                        sign_result["text"], "en", target_lang
                    )
                    sign_msg = {
                        "type": MessageType.SIGN,
                        "from": client_id,
                        "gesture": sign_result["gesture"],
                        "text": sign_result["text"],
                        "translated": translation["translated"],
                        "confidence": sign_result["confidence"],
                    }
                    ws_manager.append_history(room_id, sign_msg)
                    await ws_manager.broadcast(room_id, sign_msg, exclude=client_id)
                continue

            await ws_manager.handle_message(room_id, client_id, data)

    except WebSocketDisconnect:
        await ws_manager.disconnect(room_id, client_id)
    except Exception as exc:
        logger.exception("WebSocket error for %s in %s: %s", client_id, room_id, exc)
        await ws_manager.disconnect(room_id, client_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.debug)
