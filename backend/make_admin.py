#!/usr/bin/env python3
"""
Script to create an admin user or promote an existing user to admin.
Usage: python make_admin.py <email>
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from pymongo import MongoClient
from bson import ObjectId

# Get MongoDB URI from environment
MONGO_URI = os.getenv("DB_URI", "mongodb://localhost:27017/snapshroom_db")
DB_NAME = "snapshroom_db"

def make_admin(email):
    """Promote a user to admin (is_admin=1)"""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Find the user
    user = db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ User with email '{email}' not found")
        return False
    
    # Update the user's is_admin to 1
    result = db.users.update_one(
        {"email": email},
        {"$set": {"is_admin": 1}}
    )
    
    if result.modified_count > 0:
        print(f"✅ User '{email}' has been promoted to admin (is_admin=1)")
        return True
    else:
        print(f"⚠️ User '{email}' is already an admin")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    make_admin(email)
