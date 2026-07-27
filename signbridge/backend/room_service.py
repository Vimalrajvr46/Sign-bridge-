"""Room management service."""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone
from typing import Any

from config import get_settings


class RoomService:
    """Creates and manages video call rooms."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._rooms: dict[str, dict[str, Any]] = {}

    def generate_room_id(self) -> str:
        alphabet = string.ascii_uppercase + string.digits
        length = self.settings.room_id_length
        while True:
            room_id = "".join(secrets.choice(alphabet) for _ in range(length))
            if room_id not in self._rooms:
                return room_id

    def create_room(self, host_name: str = "Host", host_id: str | None = None) -> dict[str, Any]:
        room_id = self.generate_room_id()
        room = {
            "room_id": room_id,
            "host_id": host_id or "anonymous",
            "host_name": host_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "participant_count": 0,
            "is_active": True,
            "settings": {
                "max_participants": self.settings.max_room_participants,
                "recording_enabled": False,
                "translation_enabled": True,
            },
        }
        self._rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> dict[str, Any] | None:
        return self._rooms.get(room_id.upper())

    def join_room(self, room_id: str) -> dict[str, Any]:
        room = self.get_room(room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")
        if not room["is_active"]:
            raise ValueError(f"Room {room_id} is no longer active")
        if room["participant_count"] >= room["settings"]["max_participants"]:
            raise ValueError("Room is full")
        room["participant_count"] += 1
        return room

    def leave_room(self, room_id: str) -> None:
        room = self.get_room(room_id)
        if room and room["participant_count"] > 0:
            room["participant_count"] -= 1

    def close_room(self, room_id: str) -> None:
        room = self.get_room(room_id)
        if room:
            room["is_active"] = False

    def list_active_rooms(self) -> list[dict[str, Any]]:
        return [r for r in self._rooms.values() if r["is_active"]]


room_service = RoomService()
