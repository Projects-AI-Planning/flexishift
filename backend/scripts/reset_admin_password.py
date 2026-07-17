import argparse
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import Role, User


def reset_admin_password(email: str | None, new_password: str) -> None:
    if len(new_password.encode()) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")

    db: Session = SessionLocal()
    try:
        query = db.query(User).filter(User.role == Role.ADMIN)
        if email:
            query = query.filter(User.email == email)

        admin_user = query.order_by(User.created_at.asc()).first()
        if not admin_user:
            target = email or "any admin user"
            raise LookupError(f"No admin user found for {target}")

        admin_user.password_hash = hash_password(new_password)
        admin_user.updated_at = datetime.now(timezone.utc)
        db.commit()

        print("Admin password updated successfully.")
        print(f"Email: {admin_user.email}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset an admin user's password.")
    parser.add_argument("--email", help="Admin email to target. Defaults to the first admin account.")
    parser.add_argument("--password", required=True, help="New admin password.")
    args = parser.parse_args()

    reset_admin_password(args.email, args.password)


if __name__ == "__main__":
    main()
