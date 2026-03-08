"""
Notification Service - Handles notification creation and management
"""
from models.notification_model import NotificationModel
from typing import Dict, Any, List


class NotificationService:
    """Service for creating and managing notifications"""
    
    # -------------------------
    # Helper method to create notifications
    # -------------------------
    @staticmethod
    def create_notification(
        mongo,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        metadata: Dict[str, Any] = None
    ):
        """Create a notification for a user"""
        try:
            return NotificationModel.create(
                mongo,
                user_id,
                title,
                message,
                notification_type,
                metadata
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
            return None

    # -------------------------
    # Predefined notification templates
    # -------------------------
    @staticmethod
    def notify_login_success(mongo, user_id: str, username: str):
        """Notify user of successful login"""
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Login Successful",
            f"Welcome back, {username}! You have successfully logged in.",
            "success",
            {"action": "login"}
        )

    @staticmethod
    def notify_registration_success(mongo, user_id: str, username: str):
        """Notify user of successful registration"""
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Registration Successful",
            f"Welcome to SnapShroom, {username}! Your account has been created successfully.",
            "success",
            {"action": "register"}
        )

    @staticmethod
    def notify_profile_updated(mongo, user_id: str):
        """Notify user of profile update"""
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Profile Updated",
            "Your profile has been updated successfully.",
            "success",
            {"action": "profile_update"}
        )

    @staticmethod
    def notify_password_changed(mongo, user_id: str):
        """Notify user of password change"""
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Password Changed",
            "Your password has been updated successfully. If this wasn't you, please contact support immediately.",
            "warning",
            {"action": "password_change"}
        )

    @staticmethod
    def notify_mushroom_scan(mongo, user_id: str, mushroom_name: str, edibility: str):
        """Notify user of mushroom scan result"""
        edibility_msg = "safe to eat" if edibility == "safe" else "potentially dangerous"
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Mushroom Scan Complete",
            f"Your scan identified: {mushroom_name}. This mushroom is {edibility_msg}.",
            "info" if edibility == "safe" else "warning",
            {"action": "scan", "mushroom": mushroom_name, "edibility": edibility}
        )

    @staticmethod
    def notify_role_changed(mongo, user_id: str, new_role: str):
        """Notify user of role change"""
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Role Updated",
            f"Your role has been changed to {new_role}.",
            "info",
            {"action": "role_change", "new_role": new_role}
        )

    @staticmethod
    def notify_account_status_changed(mongo, user_id: str, is_active: bool):
        """Notify user of account status change"""
        status = "activated" if is_active else "deactivated"
        return NotificationService.create_notification(
            mongo,
            user_id,
            "Account Status Changed",
            f"Your account has been {status}.",
            "warning",
            {"action": "status_change", "is_active": is_active}
        )

    # -------------------------
    # Get notifications
    # -------------------------
    @staticmethod
    def get_user_notifications(
        mongo,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        return NotificationModel.get_by_user(mongo, user_id, limit, skip, unread_only)

    @staticmethod
    def get_unread_count(mongo, user_id: str) -> int:
        """Get count of unread notifications"""
        return NotificationModel.count_unread(mongo, user_id)

    # -------------------------
    # Update notifications
    # -------------------------
    @staticmethod
    def mark_as_read(mongo, notification_id: str) -> bool:
        """Mark a notification as read"""
        return NotificationModel.mark_as_read(mongo, notification_id)

    @staticmethod
    def mark_all_as_read(mongo, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        return NotificationModel.mark_all_as_read(mongo, user_id)

    # -------------------------
    # Delete notifications
    # -------------------------
    @staticmethod
    def delete_notification(mongo, notification_id: str) -> bool:
        """Delete a notification"""
        return NotificationModel.delete(mongo, notification_id)

    @staticmethod
    def clear_all_notifications(mongo, user_id: str) -> int:
        """Delete all notifications for a user"""
        return NotificationModel.delete_all_for_user(mongo, user_id)
