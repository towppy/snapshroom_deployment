from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token,
    create_refresh_token
)
from datetime import datetime, timedelta
from bson import ObjectId
import re
from werkzeug.security import generate_password_hash, check_password_hash
from services.notification_service import NotificationService
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    _FIREBASE_AVAILABLE = True
except ImportError:
    _FIREBASE_AVAILABLE = False


def _firebase_email_verified(email: str) -> bool:
    """Return True if the email exists in Firebase and is verified."""
    if not _FIREBASE_AVAILABLE:
        return True  # Skip check if Firebase Admin not installed
    try:
        firebase_user = firebase_auth.get_user_by_email(email)
        return firebase_user.email_verified
    except firebase_admin.exceptions.NotFoundError:
        return False
    except Exception:
        return False


def _ensure_firebase_user_and_verify(email: str, password: str = None) -> dict:
    """
    Ensure the email has a Firebase account and return its verification status.
    Returns dict: { 'verified': bool, 'created': bool, 'error': str|None }
    """
    if not _FIREBASE_AVAILABLE:
        return {'verified': True, 'created': False, 'error': None}
    try:
        firebase_user = firebase_auth.get_user_by_email(email)
        return {'verified': firebase_user.email_verified, 'created': False, 'error': None}
    except firebase_admin.exceptions.NotFoundError:
        # User not in Firebase – create account and send verification email
        try:
            create_kwargs = {'email': email, 'email_verified': False}
            if password:
                create_kwargs['password'] = password
            firebase_auth.create_user(**create_kwargs)
            try:
                link = firebase_auth.generate_email_verification_link(email)
                from services.email_service import send_firebase_verification_email
                send_firebase_verification_email(email, email.split('@')[0], link)
            except Exception as mail_err:
                current_app.logger.warning(f"Verification email failed for {email}: {mail_err}")
            return {'verified': False, 'created': True, 'error': None}
        except Exception as create_err:
            return {'verified': False, 'created': False, 'error': str(create_err)}
    except Exception as err:
        return {'verified': False, 'created': False, 'error': str(err)}

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# --------------------
# Helpers
# --------------------
def validate_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None


def validate_password(password):
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    return True, ""


def generate_username(email):
    return email.split("@")[0]


# --------------------
# REGISTER
# --------------------
@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        mongo = current_app.mongo

        email = data.get("email", "").lower().strip()
        password = (data.get("password") or "").strip()
        confirm_password = (data.get("confirmPassword") or data.get("confirm_password") or "").strip()
        name = (data.get("name") or "").strip()

        if not email or not password or not name:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        if not validate_email(email):
            return jsonify({"success": False, "message": "Invalid email format"}), 400

        valid, msg = validate_password(password)
        if not valid:
            return jsonify({"success": False, "message": msg}), 400

        if password != confirm_password:
            return jsonify({"success": False, "message": "Passwords do not match"}), 400

        existing_user = mongo.db.users.find_one({"email": email})
        if existing_user:
            # Check if already verified in Firebase – if so, hard-block
            already_verified = False
            if _FIREBASE_AVAILABLE:
                try:
                    fb_user = firebase_auth.get_user_by_email(email)
                    already_verified = fb_user.email_verified
                except firebase_admin.exceptions.NotFoundError:
                    already_verified = False
                except Exception:
                    already_verified = True  # err on the side of caution

            if already_verified:
                return jsonify({"success": False, "message": "Email already registered"}), 409

            # Not yet verified – allow re-registration: update existing record
            username = generate_username(email)
            mongo.db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {
                    "username": username,
                    "name": name,
                    "password_hash": generate_password_hash(password),
                    "created_at": datetime.utcnow(),
                    "is_active": True,
                    "is_admin": 0,
                    "avatar": None,
                    "access_token": None,
                    "refresh_token": None,
                    "token_created_at": None,
                    "token_expires_at": None,
                }}
            )
            inserted_id = existing_user["_id"]

            # Update Firebase password and resend verification
            if _FIREBASE_AVAILABLE:
                try:
                    try:
                        fb_user = firebase_auth.get_user_by_email(email)
                        firebase_auth.update_user(fb_user.uid, password=password)
                    except firebase_admin.exceptions.NotFoundError:
                        firebase_auth.create_user(email=email, password=password, email_verified=False)
                    verification_link = firebase_auth.generate_email_verification_link(email)
                    try:
                        from services.email_service import send_firebase_verification_email
                        send_firebase_verification_email(email, username, verification_link)
                    except Exception as mail_err:
                        current_app.logger.warning(f"Verification email failed: {mail_err}")
                except Exception as fb_err:
                    current_app.logger.warning(f"Firebase re-registration error: {fb_err}")

            access_token = create_access_token(
                identity=str(inserted_id),
                expires_delta=timedelta(hours=24)
            )
            refresh_token = create_refresh_token(identity=str(inserted_id))
            mongo.db.users.update_one(
                {"_id": inserted_id},
                {"$set": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_created_at": datetime.utcnow(),
                    "token_expires_at": datetime.utcnow() + timedelta(hours=24)
                }}
            )
            return jsonify({
                "success": True,
                "message": "Account updated. Please check your email to verify your address.",
                "user": {
                    "id": str(inserted_id),
                    "email": email,
                    "name": name,
                    "username": username,
                    "avatar": None,
                    "role": "user"
                },
                "access_token": access_token,
                "refresh_token": refresh_token
            }), 200

        username = generate_username(email)

        user = {
            "email": email,
            "username": username,
            "name": name,
            "password_hash": generate_password_hash(password),
            "created_at": datetime.utcnow(),
            "is_active": True,
            "is_admin": 0,
            "avatar": None,
            "access_token": None,
            "refresh_token": None,
            "token_created_at": None,
            "token_expires_at": None,
        }
    
        result = mongo.db.users.insert_one(user)

        # Create / update Firebase user and send email-verification link
        if _FIREBASE_AVAILABLE:
            try:
                try:
                    firebase_auth.get_user_by_email(email)
                except firebase_admin.exceptions.NotFoundError:
                    firebase_auth.create_user(email=email, password=password, email_verified=False)
                verification_link = firebase_auth.generate_email_verification_link(email)
                # Send via Flask-Mail if configured
                try:
                    from services.email_service import send_firebase_verification_email
                    send_firebase_verification_email(email, username, verification_link)
                except Exception as mail_err:
                    current_app.logger.warning(f"Verification email send failed: {mail_err}")
                    current_app.logger.info(f"Verification link for {email}: {verification_link}")
            except Exception as fb_err:
                current_app.logger.warning(f"Firebase user creation error: {fb_err}")

        access_token = create_access_token(
            identity=str(result.inserted_id),
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(identity=str(result.inserted_id))

        # Store tokens in database immediately after creating user
        mongo.db.users.update_one(
            {"_id": result.inserted_id},
            {"$set": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_created_at": datetime.utcnow(),
                "token_expires_at": datetime.utcnow() + timedelta(hours=24)
            }}
        )

        # Create welcome notification
        try:
            NotificationService.notify_registration_success(
                mongo, str(result.inserted_id), username
            )
        except Exception as notif_error:
            current_app.logger.warning(f"Notification error: {notif_error}")

        return jsonify({
            "success": True,
            "message": "Account created successfully",
            "user": {
                "id": str(result.inserted_id),
                "email": email,
                "name": name,
                "username": username,
                "avatar": None,
                "role": "user"
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 201

    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "message": "Server error"}), 500


# --------------------
# LOGIN
# --------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        print("[DEBUG] Login request data:", data)
        mongo = current_app.mongo

        email = data.get("email", "").lower().strip()
        password = data.get("password", "")
        print(f"[DEBUG] Email: {email}, Password Provided: {bool(password)}")

        if not email or not password:
            print("[DEBUG] Missing email or password")
            return jsonify({"success": False, "message": "Email and password required"}), 400

        # Look up user regardless of is_active first so we can give a specific message
        user = mongo.db.users.find_one({"email": email})
        print("[DEBUG] User found:", bool(user))

        if not user or not check_password_hash(user["password_hash"], password):
            print("[DEBUG] Invalid credentials")
            return jsonify({"success": False, "message": "Invalid credentials"}), 401

        # Check if account is disabled
        if not user.get("is_active", True):
            reason = user.get("deactivation_reason", "")
            msg = "Your account has been deactivated."
            if reason:
                msg = f"Your account has been deactivated for the following reason: {reason}"
            print(f"[DEBUG] Account disabled: {msg}")
            return jsonify({
                "success": False,
                "message": msg,
                "code": "account_disabled",
                "deactivation_reason": reason
            }), 403

        # Check Firebase email verification (handles existing users not yet in Firebase)
        fb = _ensure_firebase_user_and_verify(email)
        print("[DEBUG] Firebase verification:", fb)
        if not fb['verified']:
            msg = (
                "A verification email has been sent. Please verify your email before logging in."
                if fb['created']
                else "Please verify your email before logging in. Check your inbox for the verification link."
            )
            return jsonify({
                "success": False,
                "message": msg,
                "code": "email_not_verified"
            }), 403

        mongo.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        access_token = create_access_token(
            identity=str(user["_id"]),
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(identity=str(user["_id"]))

        # Store tokens in database
        mongo.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_created_at": datetime.utcnow(),
                "token_expires_at": datetime.utcnow() + timedelta(hours=24)
            }}
        )

        # Create login notification
        try:
            NotificationService.notify_login_success(
                mongo, str(user["_id"]), user.get("name", user["username"])
            )
        except Exception as notif_error:
            current_app.logger.warning(f"Notification error: {notif_error}")

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "username": user["username"],
                "avatar": user.get("avatar"),
                "role": "admin" if user.get("is_admin") == 1 else "user"
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200

    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "message": "Server error"}), 500


# --------------------
# REFRESH TOKEN (FIXED)
# --------------------
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(
        identity=user_id,
        expires_delta=timedelta(hours=24)
    )
    return jsonify({"success": True, "access_token": access_token}), 200


# --------------------
# GOOGLE AUTH
# --------------------
@auth_bp.route("/google", methods=["POST"])
def google_auth():
    try:
        data = request.get_json()
        mongo = current_app.mongo

        id_token = data.get("id_token")
        if not id_token:
            return jsonify({"success": False, "message": "Firebase ID token required"}), 400

        if not _FIREBASE_AVAILABLE:
            return jsonify({"success": False, "message": "Firebase not configured on server"}), 503

        # Verify the Firebase ID token
        try:
            decoded_token = firebase_auth.verify_id_token(id_token, clock_skew_seconds=60)
        except Exception as e:
            current_app.logger.warning(f"Invalid Firebase token: {e}")
            return jsonify({"success": False, "message": f"Invalid or expired token: {e}"}), 401

        email = decoded_token.get("email", "").lower().strip()
        name = decoded_token.get("name") or email.split("@")[0]
        avatar = decoded_token.get("picture")

        if not email:
            return jsonify({"success": False, "message": "Could not retrieve email from token"}), 400

        # Find or create user
        user = mongo.db.users.find_one({"email": email})

        if not user:
            username = generate_username(email)
            new_user = {
                "email": email,
                "username": username,
                "name": name,
                "password_hash": None,
                "created_at": datetime.utcnow(),
                "is_active": True,
                "is_admin": 0,
                "avatar": avatar,
                "provider": "google",
                "access_token": None,
                "refresh_token": None,
                "token_created_at": None,
                "token_expires_at": None,
            }
            result = mongo.db.users.insert_one(new_user)
            user_id = result.inserted_id
            try:
                NotificationService.notify_registration_success(
                    mongo, str(user_id), username
                )
            except Exception:
                pass
        else:
            user_id = user["_id"]
            if not user.get("is_active", True):
                reason = user.get("deactivation_reason", "")
                msg = "Your account has been deactivated."
                if reason:
                    msg = f"Your account has been deactivated for the following reason: {reason}"
                return jsonify({
                    "success": False,
                    "message": msg,
                    "code": "account_disabled",
                    "deactivation_reason": reason
                }), 403
            update_fields = {"last_login": datetime.utcnow()}
            if avatar and not user.get("avatar"):
                update_fields["avatar"] = avatar
            mongo.db.users.update_one({"_id": user_id}, {"$set": update_fields})

        access_token = create_access_token(
            identity=str(user_id),
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(identity=str(user_id))

        mongo.db.users.update_one(
            {"_id": user_id},
            {"$set": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_created_at": datetime.utcnow(),
                "token_expires_at": datetime.utcnow() + timedelta(hours=24)
            }}
        )

        updated_user = mongo.db.users.find_one({"_id": user_id})

        return jsonify({
            "success": True,
            "message": "Google authentication successful",
            "user": {
                "id": str(user_id),
                "email": updated_user["email"],
                "name": updated_user["name"],
                "username": updated_user["username"],
                "avatar": updated_user.get("avatar"),
                "role": "admin" if updated_user.get("is_admin") == 1 else "user"
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200

    except Exception as e:
        current_app.logger.error(f"Google auth error: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500


# --------------------
# --------------------
# LOGOUT
# --------------------
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    mongo = current_app.mongo
    user_id = get_jwt_identity()
    
    # Clear tokens from database
    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "access_token": None,
            "refresh_token": None,
            "token_expires_at": None
        }}
    )
    
    response = make_response(
        jsonify({"success": True, "message": "Logged out"}),
        200
    )
    # Clear JWT cookies
    response.delete_cookie('access_token_cookie', path='/')
    response.delete_cookie('refresh_token_cookie', path='/')
    return response


# --------------------
# GET CURRENT USER
# --------------------
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    mongo = current_app.mongo
    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({
        "success": True,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "username": user["username"],
            "avatar": user.get("avatar"),
            "role": "admin" if user.get("is_admin") == 1 else "user"
        }
    }), 200


# --------------------
# UPDATE PROFILE (Name)
# --------------------
@auth_bp.route("/update-name", methods=["PUT"])
@jwt_required()
def update_name():
    mongo = current_app.mongo
    user_id = get_jwt_identity()

    try:
        data = request.get_json()
        name = (data.get("name") or "").strip()

        if not name:
            return jsonify({"success": False, "message": "Name is required"}), 400

        user = mongo.db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": name}}
        )

        # Create profile update notification
        try:
            NotificationService.notify_profile_updated(mongo, user_id)
        except Exception as notif_error:
            current_app.logger.warning(f"Notification error: {notif_error}")

        return jsonify({
            "success": True,
            "message": "Name updated successfully",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": name,
                "username": user["username"]
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# UPDATE PASSWORD
# --------------------
@auth_bp.route("/update-password", methods=["PUT"])
@jwt_required()
def update_password():
    mongo = current_app.mongo
    user_id = get_jwt_identity()

    try:
        data = request.get_json()
        old_password = (data.get("oldPassword") or data.get("old_password") or "").strip()
        new_password = (data.get("newPassword") or data.get("new_password") or "").strip()
        confirm_password = (data.get("confirmPassword") or data.get("confirm_password") or "").strip()

        if not old_password or not new_password or not confirm_password:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        if new_password != confirm_password:
            return jsonify({"success": False, "message": "New passwords do not match"}), 400

        valid, msg = validate_password(new_password)
        if not valid:
            return jsonify({"success": False, "message": msg}), 400

        user = mongo.db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not check_password_hash(user["password_hash"], old_password):
            return jsonify({"success": False, "message": "Current password is incorrect"}), 401

        if old_password == new_password:
            return jsonify({"success": False, "message": "New password must be different from current password"}), 400

        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": generate_password_hash(new_password)}}
        )

        # Create password change notification
        try:
            NotificationService.notify_password_changed(mongo, user_id)
        except Exception as notif_error:
            current_app.logger.warning(f"Notification error: {notif_error}")

        return jsonify({
            "success": True,
            "message": "Password updated successfully"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --------------------
# UPDATE PROFILE IMAGE
# --------------------
@auth_bp.route("/update-profile-image", methods=["PUT"])
@jwt_required()
def update_profile_image():
    mongo = current_app.mongo
    user_id = get_jwt_identity()

    try:
        data = request.get_json()
        profile_image_url = (data.get("profileImage") or data.get("profile_image") or "").strip()

        if not profile_image_url:
            return jsonify({"success": False, "message": "Profile image URL is required"}), 400

        user = mongo.db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Update the avatar field in the database
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar": profile_image_url}}
        )
        
        print(f"✅ Avatar updated for user {user_id}: {profile_image_url}")
        print(f"Modified count: {result.modified_count}")

        # Create profile update notification
        try:
            NotificationService.notify_profile_updated(mongo, user_id)
        except Exception as notif_error:
            current_app.logger.warning(f"Notification error: {notif_error}")

        return jsonify({
            "success": True,
            "message": "Profile image updated successfully",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "username": user["username"],
                "avatar": profile_image_url
            }
        }), 200

    except Exception as e:
        print(f"❌ Error updating avatar: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# --------------------
# DELETE ACCOUNT (Soft Delete)
# --------------------
@auth_bp.route("/delete-account", methods=["DELETE"])
@jwt_required()
def delete_account():
    mongo = current_app.mongo
    user_id = get_jwt_identity()

    try:
        data = request.get_json()
        password = (data.get("password") or "").strip()

        if not password:
            return jsonify({"success": False, "message": "Password is required"}), 400

        user = mongo.db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Verify password
        if not check_password_hash(user["password_hash"], password):
            return jsonify({"success": False, "message": "Password is incorrect"}), 401

        # Soft delete: set is_active to False
        mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.utcnow(),
                "access_token": None,
                "refresh_token": None,
                "token_expires_at": None
            }}
        )

        response = make_response(
            jsonify({"success": True, "message": "Account deleted successfully"}),
            200
        )
        # Clear JWT cookies
        response.delete_cookie('access_token_cookie', path='/')
        response.delete_cookie('refresh_token_cookie', path='/')
        return response

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500