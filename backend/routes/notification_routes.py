"""
Notification Routes - API endpoints for notifications
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_pymongo import PyMongo
from services.notification_service import NotificationService

notification_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

def init_notification_routes(mongo: PyMongo):
    """Initialize notification routes with mongo instance"""
    
    @notification_bp.route("", methods=["GET"])
    @jwt_required()
    def get_notifications():
        """Get user's notifications with pagination"""
        try:
            user_id = get_jwt_identity()
            
            # Get query parameters
            limit = int(request.args.get("limit", 50))
            skip = int(request.args.get("skip", 0))
            unread_only = request.args.get("unread_only", "false").lower() == "true"
            
            notifications = NotificationService.get_user_notifications(
                mongo,
                user_id,
                limit,
                skip,
                unread_only
            )
            
            unread_count = NotificationService.get_unread_count(mongo, user_id)
            
            return jsonify({
                "success": True,
                "notifications": notifications,
                "unread_count": unread_count
            }), 200
            
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @notification_bp.route("/unread-count", methods=["GET"])
    @jwt_required()
    def get_unread_count():
        """Get count of unread notifications"""
        try:
            user_id = get_jwt_identity()
            count = NotificationService.get_unread_count(mongo, user_id)
            
            return jsonify({
                "success": True,
                "unread_count": count
            }), 200
            
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @notification_bp.route("/<notification_id>/read", methods=["PUT"])
    @jwt_required()
    def mark_notification_read(notification_id):
        """Mark a notification as read"""
        try:
            success = NotificationService.mark_as_read(mongo, notification_id)
            
            if success:
                return jsonify({
                    "success": True,
                    "message": "Notification marked as read"
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Notification not found or already read"
                }), 404
                
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @notification_bp.route("/mark-all-read", methods=["PUT"])
    @jwt_required()
    def mark_all_read():
        """Mark all notifications as read for the current user"""
        try:
            user_id = get_jwt_identity()
            count = NotificationService.mark_all_as_read(mongo, user_id)
            
            return jsonify({
                "success": True,
                "message": f"Marked {count} notifications as read"
            }), 200
            
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @notification_bp.route("/<notification_id>", methods=["DELETE"])
    @jwt_required()
    def delete_notification(notification_id):
        """Delete a notification"""
        try:
            success = NotificationService.delete_notification(mongo, notification_id)
            
            if success:
                return jsonify({
                    "success": True,
                    "message": "Notification deleted"
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Notification not found"
                }), 404
                
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @notification_bp.route("/clear-all", methods=["DELETE"])
    @jwt_required()
    def clear_all_notifications():
        """Delete all notifications for the current user"""
        try:
            user_id = get_jwt_identity()
            count = NotificationService.clear_all_notifications(mongo, user_id)
            
            return jsonify({
                "success": True,
                "message": f"Deleted {count} notifications"
            }), 200
            
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    return notification_bp
