from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.connection_manager import manager
from app.core.security import decode_access_token

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/jobs/{job_id}/tracking")
async def tracking_ws(
    job_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        decode_access_token(token)
    except (JWTError, Exception):
        await websocket.close(code=4001)
        return

    await manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id, websocket)
