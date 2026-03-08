"""
Migration: remove is_verified / verification_token / verification_token_expires
from all user documents.

Run once:
    python migrate_remove_verification_fields.py
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("DB_URI", "mongodb://localhost:27017/snapshroom_db")

client = MongoClient(MONGO_URI)
db_name = MONGO_URI.split("/")[-1].split("?")[0]
db = client[db_name]

fields_to_remove = {
    "is_verified": "",
    "verification_token": "",
    "verification_token_expires": "",
}

result = db.users.update_many(
    {},
    {"$unset": fields_to_remove}
)

print(f"Matched  : {result.matched_count} documents")
print(f"Modified : {result.modified_count} documents")
print("Done – is_verified / verification_token / verification_token_expires removed.")
client.close()
