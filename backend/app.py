from dotenv import load_dotenv
import os

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_mail import Mail

import sys

import cloudinary.uploader
import cloudinary_config   # this activates config
from routes.toxicity_routes_custom import toxicity_bp

# ==================================================
# FIREBASE ADMIN INITIALISATION (module-level, once)
# ==================================================
try:
    import firebase_admin
    from firebase_admin import credentials as fb_credentials
    if not firebase_admin._apps:
        _fb_cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase_admin.json")
        if os.path.exists(_fb_cred_path):
            _fb_cred = fb_credentials.Certificate(_fb_cred_path)
            firebase_admin.initialize_app(_fb_cred)
            print("[OK] Firebase Admin initialized")
        else:
            print("[WARN] firebase_admin.json not found – Firebase Admin not initialized")
except Exception as _fb_err:
    print(f"[WARN] Firebase Admin init error: {_fb_err}")


# ==================================================
# LOAD ENV VARIABLES
# ==================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
sys.path.append(BASE_DIR)

from config import get_config

# ==================================================
# EXTENSIONS
# ==================================================
mongo = PyMongo()
jwt = JWTManager()
mail = Mail()


def create_app(config_name="development"):
    app = Flask(__name__)
    app.url_map.strict_slashes = False   # prevent trailing-slash redirects that break CORS preflight

    # ==================================================
    # CONFIG
    # ==================================================
    config_obj = get_config(config_name)
    app.config.from_object(config_obj)

    app.config["MONGO_URI"] = os.getenv(
        "DB_URI", app.config.get("MONGO_URI")
    )
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY", app.config.get("JWT_SECRET_KEY")
    )
    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY", app.config.get("SECRET_KEY")
    )
    # Make NGROK_URL available everywhere in Flask config
    app.config["NGROK_URL"] = os.getenv("NGROK_URL")

    # ==================================================
    # EMAIL CONFIGURATION (Mailtrap)
    # ==================================================
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'sandbox.smtp.mailtrap.io')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 2525))
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@snapshroom.app')

    # FRONTEND URL for email verification links
    app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # ==================================================
    # CORS — open to all origins (safe: auth uses JWT in
    # Authorization header, not cookies)
    # ==================================================
    CORS(
        app,
        resources={
            r"/*": {
                "origins": "*",
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "X-Forwarded-Proto",
                    "ngrok-skip-browser-warning"
                ],
                "expose_headers": [
                    "Content-Type",
                    "Authorization"
                ],
                "max_age": 86400
            }
        }
    )

    # Explicit OPTIONS handler — guarantees preflight always succeeds
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            resp = app.make_default_options_response()
            origin = request.headers.get("Origin")
            resp.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, ngrok-skip-browser-warning"
            resp.headers["Access-Control-Max-Age"] = "86400"
            if origin:
                resp.headers["Access-Control-Allow-Credentials"] = "true"
            return resp

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, ngrok-skip-browser-warning"
        if origin:
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response



    # ==================================================
    # INIT EXTENSIONS
    # ==================================================
    mongo.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    # 🔥 expose mongo globally
    app.mongo = mongo

    # ==================================================
    # TEST DB
    # ==================================================
    with app.app_context():
        try:
            mongo.db.command("ping")
            print("[OK] MongoDB connected")
            init_database(mongo.db)
        except Exception as e:
            print("[WARN] MongoDB warning:", e)

    # ==================================================
    # FOLDERS
    # ==================================================
    for folder in [
        app.config.get("UPLOAD_FOLDER", "uploads"),
        app.config.get("MODEL_PATH", "models"),
        app.config.get("DATASET_PATH", "datasets"),
        "logs",
    ]:
        os.makedirs(folder, exist_ok=True)
        print(f"[OK] Folder {folder} ready")

    # ==================================================
    # BLUEPRINTS
    # ==================================================
    register_blueprints(app)

    # ==================================================
    # ROUTES
    # ==================================================
    @app.route("/")
    def home():
        return {"status": "SnapShroom backend running"}

    @app.route("/api/health")
    def health():
        try:
            mongo.db.command("ping")
            return {"status": "healthy"}, 200
        except:
            return {"status": "unhealthy"}, 503

    @app.route("/upload", methods=["POST"])
    def upload():
        file = request.files["image"]

        result = cloudinary.uploader.upload(file)

        return {
            "url": result["secure_url"]
        }

    # ==================================================
    # ERRORS
    # ==================================================
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Server Error", "detail": str(e)}), 500

    print("[OK] SnapShroom API initialized")
    return app


# ==================================================
# DATABASE INIT
# ==================================================
def init_database(db):
    if "users" not in db.list_collection_names():
        db.create_collection("users")

    users = db.users
    users.create_index("email", unique=True)
    users.create_index("username", unique=True)
    users.create_index("password")
    users.create_index("created_at")

    # Initialize notifications collection
    if "notifications" not in db.list_collection_names():
        db.create_collection("notifications")
    
    notifications = db.notifications
    notifications.create_index("user_id")
    notifications.create_index("created_at")
    notifications.create_index([("user_id", 1), ("is_read", 1)])

    # Initialize species collection
    if "species" not in db.list_collection_names():
        db.create_collection("species")
    
    species = db.species
    species.create_index("english_name")
    species.create_index("local_name")
    species.create_index("scientific_name")
    species.create_index("edible")
    species.create_index("location")

    # Initialize farms collection
    if "farms" not in db.list_collection_names():
        db.create_collection("farms")
    
    farms = db.farms
    farms.create_index("id", unique=True)
    farms.create_index("type")
    farms.create_index([("lat", 1), ("lng", 1)])

    print("[OK] Database ready")


# ==================================================
# BLUEPRINTS
# ==================================================
def register_blueprints(app):
    try:
        from routes.auth_routes import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/auth")
        print("[OK] Auth routes loaded")
    except Exception as e:
        print("[WARN] Blueprint error:", e)
    
    try:
        from routes.admin_routes import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/admin")
        print("[OK] Admin routes loaded")
    except Exception as e:
        print("[WARN] Admin blueprint error:", e)
    
    try:
        from routes.species_routes import species_bp
        app.register_blueprint(species_bp, url_prefix="/api/species")
        print("[OK] Species routes loaded")
    except Exception as e:
        print("[WARN] Species blueprint error:", e)
    
    try:
        from routes.notification_routes import init_notification_routes
        notification_bp = init_notification_routes(mongo)
        app.register_blueprint(notification_bp)
        print("[OK] Notification routes loaded")
    except Exception as e:
        print("[WARN] Notification blueprint error:", e)
    
    try:
        print("[...] Loading toxicity routes...")
        import sys
        sys.stdout.flush()
        from routes.toxicity_routes_custom import toxicity_bp
        app.register_blueprint(toxicity_bp, url_prefix="/api/toxicity")
        print("[OK] Toxicity/Detection routes loaded (Custom Model)")
        sys.stdout.flush()
    except Exception as e:
        print("[WARN] Toxicity blueprint error:", e)
        import traceback
        traceback.print_exc()
        import sys
        sys.stdout.flush()
    
    try:
        from routes.farms_routes import farms_bp
        app.register_blueprint(farms_bp)
        print("[OK] Farms routes loaded")
    except Exception as e:
        print("[WARN] Farms blueprint error:", e)


# ==================================================
# RUN
# ==================================================
app = create_app()

if __name__ == "__main__":
    cfg = get_config(os.getenv("FLASK_ENV", "development"))
    app.run(
        host=cfg.HOST,
        port=cfg.PORT,
        debug=False,  # Disable debug mode to prevent socket errors on Windows
        threaded=True,
        use_reloader=False,  # Disable reloader to prevent threading issues
    )