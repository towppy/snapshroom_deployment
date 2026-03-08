from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from services.admin_service import AdminService
from services.notification_service import NotificationService

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# Helper to derive role string from is_admin field
def get_role_from_user(u):
    return "admin" if u.get("is_admin") == 1 else "user"

# Middleware to check if user is admin
def admin_required(f):
    def decorated_function(*args, **kwargs):
        from functools import wraps
        @wraps(f)
        def wrapper(*args, **kwargs):
            mongo = current_app.mongo
            user_id = get_jwt_identity()
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            
            if not user or user.get("is_admin") != 1:
                return jsonify({"success": False, "message": "Admin access required"}), 403
            
            return f(*args, **kwargs)
        return wrapper
    return decorated_function


# --------------------
# GET ALL USERS
# --------------------
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_all_users():
    mongo = current_app.mongo
    user_id = get_jwt_identity()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        users = list(mongo.db.users.find().sort("created_at", -1))
        
        users_data = []
        for u in users:
            users_data.append({
                "id": str(u["_id"]),
                "email": u["email"],
                "name": u["name"],
                "username": u["username"],
                "role": get_role_from_user(u),
                "is_admin": u.get("is_admin", 0),
                "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
                "is_active": u.get("is_active", True),
                "last_login": u.get("last_login").isoformat() if u.get("last_login") else None
            })
        
        return jsonify({
            "success": True,
            "total": len(users_data),
            "users": users_data
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# GET USER BY ID
# --------------------
@admin_bp.route("/users/<user_id>", methods=["GET"])
@jwt_required()
def get_user_by_id(user_id):
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if requester is admin
    admin = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        return jsonify({
            "success": True,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "username": user["username"],
                "role": get_role_from_user(user),
                "is_admin": user.get("is_admin", 0),
                "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
                "is_active": user.get("is_active", True)
            }
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# UPDATE USER ROLE
# --------------------
@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
@jwt_required()
def update_user_role(user_id):
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if requester is admin
    admin = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        data = request.get_json()
        # Accept both formats: {"is_admin": 1/0} or {"role": "admin"/"user"}
        new_is_admin = data.get("is_admin")
        if new_is_admin is None:
            new_role = data.get("role", "").lower().strip()
            if new_role == "admin":
                new_is_admin = 1
            elif new_role == "user":
                new_is_admin = 0
            else:
                return jsonify({"success": False, "message": "Invalid role"}), 400
        
        if new_is_admin not in [0, 1]:
            return jsonify({"success": False, "message": "Invalid is_admin value. Must be 0 or 1"}), 400
        
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_admin": new_is_admin}}
        )
        
        new_role_label = "admin" if new_is_admin == 1 else "user"
        
        # Notify user about role change
        try:
            NotificationService.notify_role_changed(mongo, user_id, new_role_label)
        except Exception as notif_err:
            print(f"Failed to send role change notification: {notif_err}")
        
        return jsonify({
            "success": True,
            "message": f"User role updated to {new_role_label}"
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# DEACTIVATE USER
# --------------------
@admin_bp.route("/users/<user_id>/deactivate", methods=["PUT"])
@jwt_required()
def deactivate_user(user_id):
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if requester is admin
    admin = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        data = request.get_json() or {}
        reason = (data.get("reason") or "").strip()

        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        if str(user["_id"]) == admin_id:
            return jsonify({"success": False, "message": "Cannot deactivate your own account"}), 400
        
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "is_active": False,
                "deactivation_reason": reason,
                "deactivated_at": datetime.utcnow()
            }}
        )
        
        # In-app notification
        try:
            NotificationService.notify_account_status_changed(mongo, user_id, False)
        except Exception as notif_err:
            print(f"Failed to send deactivation notification: {notif_err}")

        # Email the user
        try:
            from services.email_service import send_account_deactivation_email
            send_account_deactivation_email(user["email"], user.get("name", user["username"]), reason)
        except Exception as mail_err:
            print(f"Failed to send deactivation email: {mail_err}")
        
        return jsonify({
            "success": True,
            "message": "User deactivated successfully"
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# ACTIVATE USER
# --------------------
@admin_bp.route("/users/<user_id>/activate", methods=["PUT"])
@jwt_required()
def activate_user(user_id):
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if requester is admin
    admin = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True}, "$unset": {"deactivation_reason": "", "deactivated_at": ""}}
        )
        
        # In-app notification
        try:
            NotificationService.notify_account_status_changed(mongo, user_id, True)
        except Exception as notif_err:
            print(f"Failed to send activation notification: {notif_err}")

        # Email the user
        try:
            from services.email_service import send_account_activation_email
            send_account_activation_email(user["email"], user.get("name", user["username"]))
        except Exception as mail_err:
            print(f"Failed to send activation email: {mail_err}")
        
        return jsonify({
            "success": True,
            "message": "User activated successfully"
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# GET COMPREHENSIVE ANALYTICS
# --------------------
@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
def get_analytics():
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not user or user.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        admin_service = AdminService(mongo)
        
        # Get user analytics
        user_analytics = admin_service.get_user_analytics()
        
        # Get mushroom analytics
        mushroom_analytics = admin_service.get_mushroom_analytics()
        
        # Get scan timeline
        scan_timeline = admin_service.get_scan_timeline(days=30)
        
        return jsonify({
            "success": True,
            "analytics": {
                "users": user_analytics,
                "mushrooms": mushroom_analytics,
                "timeline": scan_timeline
            }
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# GET MUSHROOM ANALYTICS ONLY
# --------------------
@admin_bp.route("/analytics/mushrooms", methods=["GET"])
@jwt_required()
def get_mushroom_analytics():
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not user or user.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        admin_service = AdminService(mongo)
        mushroom_analytics = admin_service.get_mushroom_analytics()
        
        return jsonify({
            "success": True,
            "analytics": mushroom_analytics
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# GET USER ANALYTICS ONLY  
# --------------------
@admin_bp.route("/analytics/users", methods=["GET"])
@jwt_required()
def get_user_analytics():
    mongo = current_app.mongo
    admin_id = get_jwt_identity()
    
    # Check if user is admin
    user = mongo.db.users.find_one({"_id": ObjectId(admin_id)})
    if not user or user.get("is_admin") != 1:
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    try:
        admin_service = AdminService(mongo)
        user_analytics = admin_service.get_user_analytics()
        
        return jsonify({
            "success": True,
            "analytics": user_analytics
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
