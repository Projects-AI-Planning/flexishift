<<<<<<< HEAD
"""
FreightFlex – Alembic Environment Configuration
Handles both online and offline migration modes
Reads database URL from app config (not hardcoded)
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# ── Add app to Python path ────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

# ── Logging ───────────────────────────────────────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import all models so Alembic can detect them ──────────────────────────────
from app.core.database import Base
from app.core.config import settings

# ── Import all models (must be imported for autogenerate to work) ─────────────
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.email_verification import EmailVerification
from app.models.password_reset import PasswordReset
from app.models.document import Document
from app.models.availability_slot import AvailabilitySlot
from app.models.availability_block import AvailabilityBlock
from app.models.job import Job
from app.models.quote import Quote
from app.models.payment import Payment
from app.models.payment_event import PaymentEvent
from app.models.compliance_record import ComplianceRecord
from app.models.tracking_point import TrackingPoint
from app.models.rating import Rating
from app.models.notification import Notification

# ── Set target metadata for autogenerate ──────────────────────────────────────
target_metadata = Base.metadata

# ── Override DB URL from app config ───────────────────────────────────────────
=======
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

from app.config import settings
from app.database import Base
import app.models  # noqa: F401 — registers all models with Base metadata

target_metadata = Base.metadata
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
<<<<<<< HEAD
    """
    Run migrations in offline mode.
    Does not require a live DB connection.
    Generates SQL script instead.
    """
=======
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
<<<<<<< HEAD
        compare_type=True,
        compare_server_default=True,
    )

=======
    )
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
<<<<<<< HEAD
    """
    Run migrations in online mode.
    Requires a live DB connection.
    """
=======
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
<<<<<<< HEAD

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

=======
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
<<<<<<< HEAD
    run_migrations_online()
=======
    run_migrations_online()
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
