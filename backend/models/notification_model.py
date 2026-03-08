from bson import ObjectId
from datetime import datetime
from typing import Optional, Dict, Any, List


class NotificationModel:
    """Notification model for MongoDB operations"""

    # -------------------------
    # Internal helpers
    # -------------------------
    @staticmethod
    def _to_object_id(id_value):
        return ObjectId(id_value) if isinstance(id_value, str) else id_value

    @staticmethod
    def _safe_notification(notification: Dict[str, Any]) -> Dict[str, Any]:
        """Return notification with proper formatting"""
        return {
            "id": str(notification["_id"]),
            "user_id": str(notification["user_id"]),
            "title": notification.get("title", ""),
            "message": notification.get("message", ""),
            "type": notification.get("type", "info"),  # info, success, warning, error
            "is_read": notification.get("is_read", False),
            "created_at": notification.get("created_at"),
            "read_at": notification.get("read_at"),
            "metadata": notification.get("metadata", {}),
        }

    # -------------------------
    # Create notification
    # -------------------------
    @staticmethod
    def create(
        mongo,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        metadata: Dict[str, Any] = None
    ) -> ObjectId:
        """Create a new notification for a user"""
        notification = {
            "user_id": NotificationModel._to_object_id(user_id),
            "title": title,
            "message": message,
            "type": notification_type,  # info, success, warning, error
            "is_read": False,
            "created_at": datetime.utcnow(),
            "read_at": None,
            "metadata": metadata or {}
        }
        
        result = mongo.db.notifications.insert_one(notification)
        return result.inserted_id

    # -------------------------
    # Fetch notifications
    # -------------------------
    @staticmethod
    def get_by_user(
        mongo,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get notifications for a specific user"""
        user_id = NotificationModel._to_object_id(user_id)
        
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        
        notifications = mongo.db.notifications.find(query).sort(
            "created_at", -1
        ).skip(skip).limit(limit)
        
        return [NotificationModel._safe_notification(n) for n in notifications]

    @staticmethod
    def get_by_id(mongo, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get a single notification by ID"""
        notification = mongo.db.notifications.find_one({
            "_id": NotificationModel._to_object_id(notification_id)
        })
        return NotificationModel._safe_notification(notification) if notification else None

    # -------------------------
    # Update notification
    # -------------------------
    @staticmethod
    def mark_as_read(mongo, notification_id: str) -> bool:
        """Mark a notification as read"""
        notification_id = NotificationModel._to_object_id(notification_id)
        
        result = mongo.db.notifications.update_one(
            {"_id": notification_id, "is_read": False},
            {"$set": {
                "is_read": True,
                "read_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0

    @staticmethod
    def mark_all_as_read(mongo, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        user_id = NotificationModel._to_object_id(user_id)
        
        result = mongo.db.notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {
                "is_read": True,
                "read_at": datetime.utcnow()
            }}
        )
        return result.modified_count

    # -------------------------
    # Delete notification
    # -------------------------
    @staticmethod
    def delete(mongo, notification_id: str) -> bool:
        """Delete a notification"""
        notification_id = NotificationModel._to_object_id(notification_id)
        
        result = mongo.db.notifications.delete_one({"_id": notification_id})
        return result.deleted_count > 0

    @staticmethod
    def delete_all_for_user(mongo, user_id: str) -> int:
        """Delete all notifications for a user"""
        user_id = NotificationModel._to_object_id(user_id)
        
        result = mongo.db.notifications.delete_many({"user_id": user_id})
        return result.deleted_count

    # -------------------------
    # Stats
    # -------------------------
    @staticmethod
    def count_unread(mongo, user_id: str) -> int:
        """Count unread notifications for a user"""
        user_id = NotificationModel._to_object_id(user_id)
        
        return mongo.db.notifications.count_documents({
            "user_id": user_id,
            "is_read": False
        })

    @staticmethod
    def count_total(mongo, user_id: str) -> int:
        """Count total notifications for a user"""
        user_id = NotificationModel._to_object_id(user_id)
        
        return mongo.db.notifications.count_documents({"user_id": user_id})
