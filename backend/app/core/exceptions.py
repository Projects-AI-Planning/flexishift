from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(status_code=409, detail=detail)


class UnprocessableError(HTTPException):
    def __init__(self, detail: str = "Unprocessable"):
        super().__init__(status_code=422, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status_code=403, detail=detail)


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": False,
            "code": exc.status_code,
            "message": exc.detail,
            "data": None,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "status": False,
            "code": 422,
            "message": "Validation failed",
            "data": {
                "errors": [
                    {
                        "field": ".".join(str(loc) for loc in error["loc"][1:]),
                        "message": error["msg"],
                    }
                    for error in exc.errors()
                ]
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": False,
            "code": 500,
            "message": "An unexpected error occurred",
            "data": None,
        },
    )
