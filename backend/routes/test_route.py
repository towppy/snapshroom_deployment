"""
Test route to debug the predictor initialization
"""
from flask import Blueprint, jsonify
import os

test_bp = Blueprint('test', __name__)

@test_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({"status": "ok"}), 200

@test_bp.route('/debug', methods=['GET'])
def debug():
    """Debug endpoint"""
    return jsonify({
        "cwd": os.getcwd(),
        "classifier_exists": os.path.exists("models/mushroom_classifier.pth"),
        "classes_exists": os.path.exists("models/mushroom_classes.json"),
        "files_in_models": os.listdir("models") if os.path.exists("models") else []
    }), 200
