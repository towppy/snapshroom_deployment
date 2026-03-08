# utils/auth.py
from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import timedelta
import os

def generate_token(user_id, expires_delta=None):
    """Generate JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(hours=1)
    return create_access_token(
        identity=str(user_id),
        expires_delta=expires_delta
    )

def generate_refresh_token(user_id):
    """Generate refresh token"""
    return create_refresh_token(identity=str(user_id))

def verify_refresh_token(refresh_token):
    """Verify refresh token (simplified)"""
    # In production, use jwt.decode with proper verification
    # This is a simplified version
    from flask_jwt_extended import decode_token
    try:
        decoded = decode_token(refresh_token)
        return decoded['sub']
    except:
        return None

def hash_password(password):
    """Hash password"""
    from werkzeug.security import generate_password_hash
    return generate_password_hash(password)

def verify_password(hashed_password, password):
    """Verify password"""
    from werkzeug.security import check_password_hash
    return check_password_hash(hashed_password, password)