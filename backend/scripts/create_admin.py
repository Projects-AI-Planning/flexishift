import sys
import os
from sqlalchemy.orm import Session

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, Role, UserStatus, UserProfile
from app.core.security import hash_password

def create_admin():
    db: Session = SessionLocal()
    try:
        admin_email = "admin@freightflex.com"
        admin_password = "AdminPassword123!"
        
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            print(f"Admin with email {admin_email} already exists.")
            return

        print(f"Creating admin user: {admin_email}...")
        
        admin_user = User(
            full_name="System Administrator",
            email=admin_email,
            phone="0000000000",
            password_hash=hash_password(admin_password),
            role=Role.ADMIN,
            status=UserStatus.ACTIVE,
            verified=True,
            profile_complete=True
        )
        
        db.add(admin_user)
        db.flush()  # To get the ID
        
        # Create profile for admin
        admin_profile = UserProfile(
            user_id=admin_user.id,
            company_name="FreightFlex Admin"
        )
        db.add(admin_profile)
        
        db.commit()
        print("Admin user created successfully!")
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
