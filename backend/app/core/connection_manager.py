from fastapi import WebSocket
from typing import Dict, Set


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}       # job_id → sockets
        self.user_active: Dict[str, Set[WebSocket]] = {}  # user_id → sockets

    # ── Job tracking connections ───────────────────────────────────────────────

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(job_id, set()).add(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket):
        self.active.get(job_id, set()).discard(websocket)
        if job_id in self.active and not self.active[job_id]:
            del self.active[job_id]

    async def broadcast(self, job_id: str, message: dict):
        dead = set()
        for ws in self.active.get(job_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.active.get(job_id, set()).difference_update(dead)

    # ── Per-user notification connections ─────────────────────────────────────

    async def connect_user(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.user_active.setdefault(user_id, set()).add(websocket)

    def disconnect_user(self, user_id: str, websocket: WebSocket):
        self.user_active.get(user_id, set()).discard(websocket)
        if user_id in self.user_active and not self.user_active[user_id]:
            del self.user_active[user_id]

    async def push_to_user(self, user_id: str, message: dict):
        dead = set()
        for ws in self.user_active.get(user_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.user_active.get(user_id, set()).difference_update(dead)


manager = ConnectionManager()
