"""
FreightFlex – Custom Exception Handlers
Single Responsibility – handles all HTTP and validation exceptions
Returns consistent JSON error envelope across all endpoints
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import structlog

logger = structlog.get_logger(__name__)


# ── Custom Exception Classes ──────────────────────────────────────────────────

class FreightFlexException(Exception):
    """Base exception for all FreightFlex custom exceptions."""
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


class NotFoundException(FreightFlexException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, "NOT_FOUND", message)


class UnauthorizedException(FreightFlexException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(401, "UNAUTHORIZED", message)


class ForbiddenException(FreightFlexException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(403, "FORBIDDEN", message)


class ConflictException(FreightFlexException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(409, "CONFLICT", message)


class ValidationException(FreightFlexException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(400, "VALIDATION_ERROR", message)


class BusinessRuleException(FreightFlexException):
    def __init__(self, message: str = "Business rule violation"):
        super().__init__(422, "BUSINESS_RULE_VIOLATION", message)


class PaymentException(FreightFlexException):
    def __init__(self, message: str = "Payment processing failed"):
        super().__init__(402, "PAYMENT_ERROR", message)


class StorageException(FreightFlexException):
    def __init__(self, message: str = "File storage failed"):
        super().__init__(500, "STORAGE_ERROR", message)


class ExternalServiceException(FreightFlexException):
    def __init__(self, message: str = "External service unavailable"):
        super().__init__(503, "EXTERNAL_SERVICE_ERROR", message)


# ── Exception Handlers ────────────────────────────────────────────────────────

async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    """
    Handles FastAPI/Starlette HTTPExceptions.
    Returns standard error envelope.
    """
    logger.warning(
        "http_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": str(exc.detail).upper().replace(" ", "_"),
            "message": exc.detail,
        },
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Handles Pydantic validation errors.
    Returns field-level error details.
    """
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"][1:])
        errors.append({
            "field": field,
            "message": error["msg"],
        })

    logger.warning(
        "validation_error",
        path=request.url.path,
        errors=errors,
    )

    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "code": "VALIDATION_ERROR",
            "message": "Validation failed",
            "errors": errors,
        },
    )


async def freightflex_exception_handler(
    request: Request,
    exc: FreightFlexException,
) -> JSONResponse:
    """
    Handles all custom FreightFlex exceptions.
    """
    logger.warning(
        "freightflex_exception",
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": exc.code,
            "message": exc.message,
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Catches all unhandled exceptions.
    Returns 500 without exposing internal details.
    """
    logger.error(
        "unhandled_exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        },
    )