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
    """Real-time GPS location stream for a job. Used by the haulier web dashboard map."""
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


@router.websocket("/ws/notifications/live")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(...),
):
    """Real-time notification push stream. Used by both mobile and web clients."""
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError("no sub")
    except (JWTError, Exception):
        await websocket.close(code=4001)
        return

    await manager.connect_user(user_id, websocket)
    try:
        while True:
            # Keep-alive: client can send pings, we echo them back
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_user(user_id, websocket)
