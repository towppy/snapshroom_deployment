#!/usr/bin/env python3
"""
Migration script: Convert 'role' field to 'is_admin' field in users collection.

- role="admin" → is_admin=1
- role="user" (or missing) → is_admin=0

Usage: python migrate_role_to_is_admin.py
"""

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from pymongo import MongoClient

MONGO_URI = os.getenv("DB_URI", "mongodb://localhost:27017/snapshroom_db")
DB_NAME = "snapshroom_db"


def migrate():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    users = list(db.users.find())
    print(f"Found {len(users)} users to migrate")

    updated = 0
    for user in users:
        old_role = user.get("role", "user")
        new_is_admin = 1 if old_role == "admin" else 0

        db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"is_admin": new_is_admin},
                "$unset": {"role": ""}  # Remove the old role field
            }
        )
        updated += 1
        status = "admin" if new_is_admin == 1 else "user"
        print(f"  ✅ {user.get('email', 'unknown')} → is_admin={new_is_admin} ({status})")

    print(f"\n✅ Migration complete! {updated} users updated.")
    print("  - Old 'role' field has been removed")
    print("  - New 'is_admin' field set (1=admin, 0=user)")


if __name__ == "__main__":
    migrate()
