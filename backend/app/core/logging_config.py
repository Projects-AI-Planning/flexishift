"""
Configure structlog to write to rotating log files inside logs/.

Three files:
  logs/app.log    — all INFO+ messages (general application log)
  logs/audit.log  — security / business events only (action=audit_event)
  logs/error.log  — WARNING+ messages
"""

import logging
import logging.handlers
import sys
from pathlib import Path

import structlog


LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def _rotating(filename: str, level: int) -> logging.Handler:
    h = logging.handlers.RotatingFileHandler(
        LOG_DIR / filename,
        maxBytes=10 * 1024 * 1024,   # 10 MB
        backupCount=10,
        encoding="utf-8",
    )
    h.setLevel(level)
    return h


class _AuditFilter(logging.Filter):
    """Pass only records that carry event='audit_event'."""
    def filter(self, record: logging.LogRecord) -> bool:
        return getattr(record, "event", "") == "audit_event"


def configure_logging() -> None:
    # ── stdlib root logger ────────────────────────────────────────────────────
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    fmt = logging.Formatter("%(message)s")   # structlog already serialises

    # console — INFO+
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)

    # app.log — INFO+
    app_h = _rotating("app.log", logging.INFO)
    app_h.setFormatter(fmt)

    # error.log — WARNING+
    err_h = _rotating("error.log", logging.WARNING)
    err_h.setFormatter(fmt)

    # audit.log — only audit_event records
    audit_h = _rotating("audit.log", logging.INFO)
    audit_h.setFormatter(fmt)
    audit_h.addFilter(_AuditFilter())

    for handler in (console, app_h, err_h, audit_h):
        root.addHandler(handler)

    # ── structlog ─────────────────────────────────────────────────────────────
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
