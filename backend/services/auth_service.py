# services/auth_service.py
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)

def register_user(mongo, username, email, password, name=None):
    """Register a new user with proper error handling and MongoDB connection
    
    Args:
        mongo: PyMongo instance
        username: User's username
        email: User's email
        password: User's password (will be hashed)
        name: User's display name (optional, defaults to username)
    
    Returns:
        ObjectId of the inserted user document, or None if registration fails
        
    Raises:
        DuplicateKeyError: If email or username already exists
        Exception: For other database errors
    """
    try:
        users = mongo.db.users
        
        # Create user document with proper structure
        user_data = {
            "username": username.lower(),  # Store lowercase for case-insensitive queries
            "username_original": username,  # Store original case for display
            "email": email.lower(),  # Store lowercase for case-insensitive queries
            "email_original": email,  # Store original email for display
            "name": name or username,
            "password_hash": generate_password_hash(password),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "subscription": {"type": "free"},
            "preferences": {
                "notifications": True,
                "email_updates": True
            },
            "profile": {
                "avatar": None,
                "bio": None
            }
        }
        
        # Insert user document
        result = users.insert_one(user_data)
        logger.info(f"User registered successfully: {username} ({email})")
        return result.inserted_id
        
    except DuplicateKeyError as e:
        logger.warning(f"Duplicate key error during registration: {str(e)}")
        # Determine which field caused the duplicate
        if "email" in str(e):
            raise ValueError("Email already exists")
        elif "username" in str(e):
            raise ValueError("Username already exists")
        else:
            raise ValueError("User already exists")
    except Exception as e:
        logger.error(f"Error registering user {username}: {str(e)}")
        raise

def login_user(mongo, email, password):
    """Authenticate user and return user ID
    
    Args:
        mongo: PyMongo instance
        email: User's email
        password: User's password
    
    Returns:
        ObjectId of the user if authentication succeeds, None otherwise
    """
    try:
        users = mongo.db.users
        user = users.find_one({"email": email.lower()})
        
        if user and check_password_hash(user["password_hash"], password):
            logger.info(f"User logged in: {email}")
            return user["_id"]
        
        logger.warning(f"Failed login attempt for: {email}")
        return None
    except Exception as e:
        logger.error(f"Error during login for {email}: {str(e)}")
        return None

def get_user_by_id(mongo, user_id):
    """Get user by ID
    
    Args:
        mongo: PyMongo instance
        user_id: User's ObjectId or string representation
    
    Returns:
        User document or None if not found
    """
    try:
        # Convert string to ObjectId if necessary
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        return mongo.db.users.find_one({"_id": user_id})
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        return None

def update_user_profile(mongo, user_id, update_data):
    """Update user profile
    
    Args:
        mongo: PyMongo instance
        user_id: User's ObjectId or string representation
        update_data: Dictionary of fields to update
    
    Returns:
        True if update was successful, False otherwise
    """
    try:
        # Convert string to ObjectId if necessary
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        # Remove sensitive fields from update
        update_data_safe = update_data.copy()
        if "password_hash" in update_data_safe:
            del update_data_safe["password_hash"]
        if "_id" in update_data_safe:
            del update_data_safe["_id"]
        
        # Add update timestamp
        update_data_safe["updated_at"] = datetime.utcnow()
        
        result = mongo.db.users.update_one(
            {"_id": user_id},
            {"$set": update_data_safe}
        )
        
        if result.modified_count > 0:
            logger.info(f"User profile updated: {user_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}")
        return False

def user_exists(mongo, email=None, username=None):
    """Check if user exists by email or username
    
    Args:
        mongo: PyMongo instance
        email: User's email (optional)
        username: User's username (optional)
    
    Returns:
        User document if exists, None otherwise
    """
    try:
        users = mongo.db.users
        query = {"$or": []}
        
        if email:
            query["$or"].append({"email": email.lower()})
        if username:
            query["$or"].append({"username": username.lower()})
        
        if not query["$or"]:
            return None
        
        return users.find_one(query)
    except Exception as e:
        logger.error(f"Error checking user existence: {str(e)}")
        return None