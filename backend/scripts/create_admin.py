import sys
import os
import getpass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, Role, UserStatus, UserProfile


def prompt_input(label: str, hidden: bool = False) -> str:
    while True:
        value = getpass.getpass(f"{label}: ") if hidden else input(f"{label}: ").strip()
        if value:
            return value
        print("  Value cannot be empty, try again.")


def create_admin():
    print("=== Create Admin User ===")
    full_name = prompt_input("Full name")
    email     = prompt_input("Email")
    phone     = prompt_input("Phone")

    while True:
        password = prompt_input("Password (max 72 chars)", hidden=True)
        if len(password.encode()) > 72:
            print("  Password exceeds 72 bytes (bcrypt limit), choose a shorter one.")
            continue
        confirm = prompt_input("Confirm password", hidden=True)
        if password != confirm:
            print("  Passwords do not match, try again.")
            continue
        break

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"A user with email '{email}' already exists.")
            return

        admin_user = User(
            full_name=full_name,
            email=email,
            phone=phone,
            password_hash=password_hash,
            role=Role.ADMIN,
            status=UserStatus.ACTIVE,
            verified=True,
            profile_complete=True,
        )
        db.add(admin_user)
        db.flush()

        db.add(UserProfile(user_id=admin_user.id, company_name="FreightFlex Admin"))
        db.commit()

        print(f"\nAdmin user created successfully!")
        print(f"  Email : {email}")
        print(f"  Role  : ADMIN")

    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
