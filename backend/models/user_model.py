from bson import ObjectId
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict, Any, List


class UserModel:
    """User model for MongoDB operations (SnapShroom)"""

    # -------------------------
    # Internal helpers
    # -------------------------
    @staticmethod
    def _to_object_id(user_id):
        return ObjectId(user_id) if isinstance(user_id, str) else user_id

    @staticmethod
    def _safe_user(user: Dict[str, Any]) -> Dict[str, Any]:
        """Return user without sensitive fields"""
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "username": user.get("username"),
            "name": user.get("name"),
            "avatar": user.get("avatar"),
            "role": "admin" if user.get("is_admin") == 1 else "user",
            "is_admin": user.get("is_admin", 0),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login"),
            "subscription": user.get("subscription", {"type": "free"}),
            "preferences": user.get("preferences", {}),
        }

    # -------------------------
    # Fetch users
    # -------------------------
    @staticmethod
    def get_by_email(mongo, email: str) -> Optional[Dict[str, Any]]:
        email = email.strip().lower()
        user = mongo.db.users.find_one({"email": email, "is_active": True})
        return UserModel._safe_user(user) if user else None

    @staticmethod
    def get_by_id(mongo, user_id: str) -> Optional[Dict[str, Any]]:
        user = mongo.db.users.find_one({
            "_id": UserModel._to_object_id(user_id),
            "is_active": True
        })
        return UserModel._safe_user(user) if user else None

    @staticmethod
    def get_raw_by_email(mongo, email: str) -> Optional[Dict[str, Any]]:
        """Internal use only (includes password_hash)"""
        return mongo.db.users.find_one({"email": email.lower().strip()})

    # -------------------------
    # Create user
    # -------------------------
    @staticmethod
    def create(mongo, email: str, password: str, name: str) -> ObjectId:
        email = email.strip().lower()

        if mongo.db.users.find_one({"email": email}):
            raise ValueError("Email already registered")

        username = email.split("@")[0]

        user = {
            "email": email,
            "username": username,
            "name": name,
            "password_hash": generate_password_hash(password),
            "is_admin": 0,
            "avatar": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None,
            "is_active": True,
            "subscription": {"type": "free"},
            "preferences": {
                "notifications": True,
                "email_updates": True
            },
            "stats": {
                "identifications": 0,
                "correct_identifications": 0,
                "favorites": 0,
                "badges": []
            }
        }

        result = mongo.db.users.insert_one(user)
        return result.inserted_id

    # -------------------------
    # Authentication
    # -------------------------
    @staticmethod
    def authenticate(mongo, email: str, password: str) -> Optional[Dict[str, Any]]:
        user = mongo.db.users.find_one({
            "email": email.lower().strip(),
            "is_active": True
        })

        if not user:
            return None

        if not check_password_hash(user["password_hash"], password):
            return None

        mongo.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        return UserModel._safe_user(user)

    # -------------------------
    # Update user
    # -------------------------
    @staticmethod
    def update(mongo, user_id: str, updates: Dict[str, Any]) -> bool:
        user_id = UserModel._to_object_id(user_id)

        updates.pop("_id", None)
        updates.pop("id", None)
        updates.pop("password_hash", None)
        updates["updated_at"] = datetime.utcnow()

        if "password" in updates:
            updates["password_hash"] = generate_password_hash(updates.pop("password"))

        result = mongo.db.users.update_one(
            {"_id": user_id, "is_active": True},
            {"$set": updates}
        )
        return result.modified_count > 0

    # -------------------------
    # Password management
    # -------------------------
    @staticmethod
    def change_password(mongo, user_id: str, old_password: str, new_password: str) -> bool:
        user_id = UserModel._to_object_id(user_id)
        user = mongo.db.users.find_one({"_id": user_id, "is_active": True})

        if not user or not check_password_hash(user["password_hash"], old_password):
            return False

        mongo.db.users.update_one(
            {"_id": user_id},
            {"$set": {
                "password_hash": generate_password_hash(new_password),
                "updated_at": datetime.utcnow()
            }}
        )
        return True

    # -------------------------
    # Soft delete
    # -------------------------
    @staticmethod
    def deactivate(mongo, user_id: str) -> bool:
        user_id = UserModel._to_object_id(user_id)

        result = mongo.db.users.update_one(
            {"_id": user_id},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0

    # -------------------------
    # Stats
    # -------------------------
    @staticmethod
    def increment_stats(mongo, user_id: str, increments: Dict[str, int]) -> bool:
        user_id = UserModel._to_object_id(user_id)

        inc_ops = {f"stats.{k}": v for k, v in increments.items()}

        result = mongo.db.users.update_one(
            {"_id": user_id, "is_active": True},
            {
                "$inc": inc_ops,
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

    # -------------------------
    # Admin / lists
    # -------------------------
    @staticmethod
    def get_all(mongo, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        users = mongo.db.users.find(
            {"is_active": True},
            {"password_hash": 0}
        ).skip(skip).limit(limit)

        return [UserModel._safe_user(u) for u in users]

    @staticmethod
    def count(mongo) -> int:
        return mongo.db.users.count_documents({"is_active": True})


# Backward compatibility aliases
get_user_by_email = UserModel.get_by_email
get_user_by_id = UserModel.get_by_id
create_user = UserModel.create
