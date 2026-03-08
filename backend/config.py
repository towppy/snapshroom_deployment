import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # ===============================
    # Flask Core Configuration
    # ===============================
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    TESTING = False

    # ===============================
    # MongoDB Configuration - UPDATED for snapshroom_db
    # ===============================
    # Use DB_URI from .env for MongoDB Atlas connection
    MONGO_URI = os.environ.get('DB_URI') or os.environ.get('MONGO_URI') or "mongodb://localhost:27017/snapshroom_db"
    MONGO_DBNAME = 'snapshroom_db'  # Always use snapshroom_db as per your .env
    DB_NAME = 'snapshroom_db'  # Alias for consistency
    MONGO_CONNECT_TIMEOUT_MS = 20000
    MONGO_SOCKET_TIMEOUT_MS = 20000
    MONGO_SERVER_SELECTION_TIMEOUT_MS = 30000

    # ===============================
    # JWT Configuration
    # ===============================
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key-change-this-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24  # 1 day (in seconds)
    JWT_REFRESH_TOKEN_EXPIRES = 60 * 60 * 24 * 30  # 30 days
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False  # Set to True in production with HTTPS
    JWT_COOKIE_CSRF_PROTECT = False  # Set to True in production

    # ===============================
    # Upload Configuration
    # ===============================
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Create upload folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # ===============================
    # Model Configuration
    # ===============================
    MODEL_PATH = os.path.join(os.getcwd(), 'models')
    SPECIES_MODEL_PATH = os.path.join(MODEL_PATH, 'species_model.pkl')
    TOXICITY_MODEL_PATH = os.path.join(MODEL_PATH, 'mushroom_edibility.pth')  # Updated to match your actual file
    # Note: Keep both for backward compatibility
    TOXICITY_PICKLE_PATH = os.path.join(MODEL_PATH, 'toxicity_model.pkl')  # If you have this file
    PYTORCH_MODEL_PATH = os.path.join(MODEL_PATH, 'pytorch_model.pth')

    # ===============================
    # Dataset Configuration
    # ===============================
    DATASET_PATH = os.path.join(os.getcwd(), 'dataset')
    CSV_PATH = os.path.join(os.getcwd(), 'mushrooms.csv')
    
    # Create dataset folder if it doesn't exist
    os.makedirs(DATASET_PATH, exist_ok=True)

    # ===============================
    # API Configuration
    # ===============================
    API_PREFIX = '/api'
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    API_VERSION = 'v1'
    
    # Rate limiting (optional)
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'False').lower() == 'true'
    RATELIMIT_DEFAULT = "200 per day; 50 per hour"
    RATELIMIT_STORAGE_URL = "memory://"

    # ===============================
    # CORS Configuration
    # ===============================
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8081,http://localhost:3000,exp://*').split(',')
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_EXPOSE_HEADERS = ['X-Total-Count', 'Content-Range']
    CORS_MAX_AGE = 86400  # 24 hours

    # ===============================
    # Logging Configuration
    # ===============================
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE = os.path.join(os.getcwd(), 'logs', 'snapshroom.log')
    
    # Create logs directory if it doesn't exist
    os.makedirs(os.path.join(os.getcwd(), 'logs'), exist_ok=True)

    # ===============================
    # Cache Configuration (optional)
    # ===============================
    CACHE_TYPE = 'simple'  # Use 'redis' in production
    CACHE_DEFAULT_TIMEOUT = 300  # 5 minutes

    # ===============================
    # Email Configuration (optional)
    # ===============================
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@snapshroom.com')

    # ===============================
    # Feature Flags
    # ===============================
    ENABLE_REGISTRATION = os.environ.get('ENABLE_REGISTRATION', 'True').lower() == 'true'
    ENABLE_EMAIL_VERIFICATION = os.environ.get('ENABLE_EMAIL_VERIFICATION', 'False').lower() == 'true'
    ENABLE_API_DOCS = os.environ.get('ENABLE_API_DOCS', 'True').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    # Development-specific settings
    JWT_COOKIE_SECURE = False
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:19006', 'exp://*']
    
    # Logging
    LOG_LEVEL = 'DEBUG'
    
    # Cache
    CACHE_TYPE = 'null'  # Disable cache in development


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    MONGO_URI = os.environ.get('MONGO_URI') or "mongodb://localhost:27017/snapshroom_test"
    MONGO_DBNAME = 'snapshroom_test'
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Use in-memory cache for testing
    CACHE_TYPE = 'simple'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Production security
    JWT_COOKIE_SECURE = True  # HTTPS only
    JWT_COOKIE_CSRF_PROTECT = True
    
    # Use environment variables for production
    SECRET_KEY = os.environ.get('SECRET_KEY') or Config.SECRET_KEY
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or Config.JWT_SECRET_KEY
    MONGO_URI = os.environ.get('DB_URI') or os.environ.get('MONGO_URI') or Config.MONGO_URI
    
    # CORS - restrict in production
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
    
    # Logging
    LOG_LEVEL = 'WARNING'
    
    # Cache - use Redis in production
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'redis')
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')


# ===============================
# Configuration Mapping
# ===============================
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(config_name='default'):
    """Get configuration class by name"""
    return config.get(config_name, config['default'])


# Helper function to get configuration as dict
def get_config_dict(config_name='default'):
    """Get configuration as dictionary (useful for debugging)"""
    config_obj = get_config(config_name)
    config_dict = {}
    
    # Only include non-callable, non-private attributes
    for key in dir(config_obj):
        if not key.startswith('_') and not callable(getattr(config_obj, key)):
            value = getattr(config_obj, key)
            # Skip sensitive data
            if any(sensitive in key.lower() for sensitive in ['key', 'password', 'secret', 'token']):
                value = '***HIDDEN***' if value else None
            config_dict[key] = value
    
    return config_dict


# Print configuration for debugging
if __name__ == '__main__':
    print("Current Configuration:")
    print("-" * 50)
    
    current_env = os.environ.get('FLASK_ENV', 'development')
    config_dict = get_config_dict(current_env)
    
    # Override with environment variables for display
    if os.environ.get('DB_URI'):
        config_dict['MONGO_URI'] = os.environ.get('DB_URI')
    
    for key, value in sorted(config_dict.items()):
        if key in ['SECRET_KEY', 'JWT_SECRET_KEY'] and value:
            print(f"{key:30} = {'*' * 20} (set from env)")
        elif key == 'MONGO_URI' and value:
            # Truncate long MongoDB URIs for display
            if 'mongodb+srv://' in str(value):
                display_value = 'mongodb+srv://*****:*****@cluster0.*****.mongodb.net/...'
                print(f"{key:30} = {display_value}")
            else:
                print(f"{key:30} = {value}")
        else:
            print(f"{key:30} = {value}")
    
    print("-" * 50)
    print(f"Environment: {current_env}")
    print(f"Database: {config_dict.get('MONGO_DBNAME')}")
    print(f"Running on: http://{config_dict.get('HOST')}:{config_dict.get('PORT')}")
    
    # Check if .env variables are loaded
    print(f"\nEnvironment Variables Check:")
    print(f"  DB_URI loaded: {'Yes' if os.environ.get('DB_URI') else 'No'}")
    print(f"  JWT_SECRET_KEY loaded: {'Yes' if os.environ.get('JWT_SECRET_KEY') else 'No'}")
    print(f"  SECRET_KEY loaded: {'Yes' if os.environ.get('SECRET_KEY') else 'No'}")