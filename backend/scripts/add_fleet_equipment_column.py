from __future__ import annotations

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    if "equipment_details" in columns:
        print("user_profiles.equipment_details already exists.")
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE user_profiles ADD COLUMN equipment_details JSON NULL"))

    print("Added user_profiles.equipment_details column.")


if __name__ == "__main__":
    main()
