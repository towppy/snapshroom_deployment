from flask import Blueprint, request, jsonify
from services.habitat_analyzer import analyze_habitat
from utils.json_encoder import safe_jsonify

habitat_bp = Blueprint("habitat", __name__)

@habitat_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.json

    result = analyze_habitat(
        data["latitude"],
        data["longitude"],
        data["habitat_type"]
    )

    return safe_jsonify(result)
