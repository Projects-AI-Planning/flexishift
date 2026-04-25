from fastapi import WebSocket
from typing import Dict, Set


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}

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
        if dead:
            self.active.get(job_id, set()).difference_update(dead)


manager = ConnectionManager()
