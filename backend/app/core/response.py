from typing import Any
from fastapi.responses import JSONResponse


def ok(data: Any = None, message: str = "Success", code: int = 200) -> dict:
    return {"status": True, "code": code, "message": message, "data": data}


def fail(message: str, code: int = 400, data: Any = None) -> JSONResponse:
    return JSONResponse(
        status_code=code,
        content={"status": False, "code": code, "message": message, "data": data},
    )


def created(data: Any = None, message: str = "Created successfully") -> dict:
    return ok(data=data, message=message, code=201)
