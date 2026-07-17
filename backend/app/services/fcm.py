import httpx
import structlog

from app.config import settings

log = structlog.get_logger()

FCM_URL = "https://fcm.googleapis.com/fcm/send"


async def send_push(token: str, title: str, body: str, data: dict | None = None) -> None:
    if not settings.FCM_SERVER_KEY or not token:
        return

    payload = {
        "to": token,
        "notification": {"title": title, "body": body, "sound": "default"},
        "data": data or {},
    }
    headers = {
        "Authorization": f"key={settings.FCM_SERVER_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(FCM_URL, json=payload, headers=headers, timeout=10)
        if resp.status_code != 200:
            log.error("fcm_error", status=resp.status_code, body=resp.text)


async def send_push_to_user(user, title: str, body: str, data: dict | None = None) -> None:
    if user.push_token:
        await send_push(user.push_token, title, body, data)
