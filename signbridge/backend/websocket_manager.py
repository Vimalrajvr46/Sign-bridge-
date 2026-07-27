"""WebSocket connection manager for rooms, signaling, and real-time messaging."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    JOIN = "join"
    LEAVE = "leave"
    SIGNAL = "signal"
    SPEECH = "speech"
    CAPTION = "caption"
    AVATAR = "avatar"
    CHAT = "chat"
    SIGN = "sign"
    TRANSLATION = "translation"
    STATUS = "status"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"


@dataclass
class Participant:
    client_id: str
    websocket: WebSocket
    role: str = "hearing"
    display_name: str = "Guest"
    language: str = "en"
    avatar_config: dict[str, Any] = field(default_factory=dict)
    joined_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class Room:
    room_id: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    participants: dict[str, Participant] = field(default_factory=dict)
    history: list[dict[str, Any]] = field(default_factory=list)


class WebSocketManager:
    """Manages WebSocket connections, rooms, and message broadcasting."""

    def __init__(self) -> None:
        self.rooms: dict[str, Room] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        room_id: str,
        client_id: str,
        role: str = "hearing",
        display_name: str = "Guest",
        language: str = "en",
        avatar_config: dict[str, Any] | None = None,
    ) -> Room:
        await websocket.accept()
        async with self._lock:
            room = self.rooms.setdefault(room_id, Room(room_id=room_id))
            participant = Participant(
                client_id=client_id,
                websocket=websocket,
                role=role,
                display_name=display_name,
                language=language,
                avatar_config=avatar_config or {},
            )
            room.participants[client_id] = participant

        await self.broadcast(
            room_id,
            {
                "type": MessageType.JOIN,
                "client_id": client_id,
                "display_name": display_name,
                "role": role,
                "language": language,
                "participants": self.get_participant_list(room_id),
            },
            exclude=client_id,
        )
        await self.send_personal(
            client_id,
            room_id,
            {
                "type": MessageType.JOIN,
                "client_id": client_id,
                "room_id": room_id,
                "participants": self.get_participant_list(room_id),
                "history": self.get_history(room_id, limit=50),
            },
        )
        logger.info("Client %s joined room %s as %s", client_id, room_id, role)
        return room

    async def disconnect(self, room_id: str, client_id: str) -> None:
        async with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return
            room.participants.pop(client_id, None)
            if not room.participants:
                self.rooms.pop(room_id, None)
                logger.info("Room %s closed (empty)", room_id)
                return

        await self.broadcast(
            room_id,
            {
                "type": MessageType.LEAVE,
                "client_id": client_id,
                "participants": self.get_participant_list(room_id),
            },
        )
        logger.info("Client %s left room %s", client_id, room_id)

    def get_participant_list(self, room_id: str) -> list[dict[str, Any]]:
        room = self.rooms.get(room_id)
        if not room:
            return []
        return [
            {
                "client_id": p.client_id,
                "display_name": p.display_name,
                "role": p.role,
                "language": p.language,
                "avatar_config": p.avatar_config,
            }
            for p in room.participants.values()
        ]

    def get_history(self, room_id: str, limit: int = 100) -> list[dict[str, Any]]:
        room = self.rooms.get(room_id)
        if not room:
            return []
        return room.history[-limit:]

    def append_history(self, room_id: str, entry: dict[str, Any]) -> None:
        room = self.rooms.get(room_id)
        if room:
            entry["timestamp"] = datetime.now(timezone.utc).isoformat()
            room.history.append(entry)

    async def send_personal(
        self, client_id: str, room_id: str, message: dict[str, Any]
    ) -> None:
        room = self.rooms.get(room_id)
        if not room:
            return
        participant = room.participants.get(client_id)
        if participant:
            await participant.websocket.send_json(message)

    async def broadcast(
        self,
        room_id: str,
        message: dict[str, Any],
        exclude: str | None = None,
    ) -> None:
        room = self.rooms.get(room_id)
        if not room:
            return
        payload = json.loads(json.dumps(message, default=str))
        tasks = []
        for cid, participant in room.participants.items():
            if exclude and cid == exclude:
                continue
            tasks.append(participant.websocket.send_json(payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def handle_message(
        self, room_id: str, client_id: str, data: dict[str, Any]
    ) -> None:
        msg_type = data.get("type", "")

        if msg_type == MessageType.PING:
            await self.send_personal(client_id, room_id, {"type": MessageType.PONG})
            return

        if msg_type == MessageType.SIGNAL:
            target = data.get("target")
            if target:
                await self.send_personal(target, room_id, {**data, "from": client_id})
            else:
                await self.broadcast(room_id, {**data, "from": client_id}, exclude=client_id)
            return

        if msg_type in (
            MessageType.SPEECH,
            MessageType.CAPTION,
            MessageType.AVATAR,
            MessageType.CHAT,
            MessageType.SIGN,
            MessageType.TRANSLATION,
            MessageType.STATUS,
        ):
            data["from"] = client_id
            self.append_history(room_id, data)
            await self.broadcast(room_id, data, exclude=client_id)
            return

        await self.send_personal(
            client_id,
            room_id,
            {"type": MessageType.ERROR, "message": f"Unknown message type: {msg_type}"},
        )


# Singleton manager instance
ws_manager = WebSocketManager()


def generate_client_id() -> str:
    return str(uuid4())
