from flask import Blueprint, jsonify, send_from_directory, request
from datasets.mushroom_dataset import MushroomDataset
from services.species_classifier import species_classifier
from services.risk_engine import risk_engine
import os
import pandas as pd
from utils.json_encoder import safe_jsonify, make_json_serializable

dataset_bp = Blueprint("dataset", __name__)

@dataset_bp.route("/info", methods=["GET"])
def get_dataset_info():
    """
    Get dataset statistics and information.
    """
    try:
        # Try to create a dataset instance to get statistics
        dataset_path = "dataset"
        csv_path = "mushrooms.csv"

        if os.path.exists(dataset_path):
            train_dataset = MushroomDataset(dataset_path, csv_path, classification_type='edibility', subset='train')
            test_dataset = MushroomDataset(dataset_path, csv_path, classification_type='edibility', subset='test')

            info = {
                "total_species": len(train_dataset.class_names),
                "training_samples": len(train_dataset),
                "test_samples": len(test_dataset),
                "class_distribution": train_dataset.get_class_distribution(),
                "available_classes": train_dataset.class_names
            }
        else:
            info = {"error": "Dataset directory not found"}

        # Add risk statistics if available
        risk_stats = risk_engine.get_risk_statistics()
        info["risk_statistics"] = risk_stats

        return safe_jsonify(info)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dataset_bp.route("/species", methods=["GET"])
def get_species_list():
    """
    Get list of all available mushroom species.
    """
    try:
        species_list = species_classifier.get_available_species()

        # Get detailed species info from CSV
        detailed_species = []
        for species in species_list:
            info = species_classifier._get_species_metadata(species)
            if info:
                detailed_species.append(info)
            else:
                detailed_species.append({
                    "scientific_name": species,
                    "english_name": species,
                    "local_name": species
                })

        return safe_jsonify({
            "count": len(detailed_species),
            "species": detailed_species
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dataset_bp.route("/species/<species_name>", methods=["GET"])
def get_species_details(species_name):
    """
    Get detailed information about a specific species.
    """
    try:
        info = species_classifier._get_species_metadata(species_name)
        if info:
            # Add toxicity info
            toxicity_info = species_classifier.toxicity_detector.get_toxicity_info_by_species(species_name)
            if toxicity_info:
                info["toxicity_info"] = toxicity_info

            return safe_jsonify(info)
        else:
            return jsonify({"error": "Species not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dataset_bp.route("/images/<path:image_path>")
def get_image(image_path):
    """
    Serve dataset images.
    """
    try:
        # Security check - ensure path is within dataset directory
        full_path = os.path.join("dataset", image_path)
        if not os.path.exists(full_path):
            return jsonify({"error": "Image not found"}), 404

        # Get directory and filename
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)

        return send_from_directory(directory, filename)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dataset_bp.route("/search", methods=["GET"])
def search_species():
    """
    Search for species by name, region, or characteristics.
    """
    try:
        query = request.args.get('q', '').lower()
        region = request.args.get('region', '').lower()
        edible_only = request.args.get('edible_only', '').lower() == 'true'

        if not species_classifier.csv_data is None:
            df = species_classifier.csv_data

            # Apply filters
            if query:
                mask = (
                    df['scientific_name'].str.lower().str.contains(query) |
                    df['english_name'].str.lower().str.contains(query) |
                    df['local_name'].str.lower().str.contains(query)
                )
                df = df[mask]

            if region:
                df = df[df['location_region'].str.lower().str.contains(region)]

            if edible_only:
                df = df[df['edible'] == True]

            results = df.to_dict('records')
            # Convert pandas types to native Python types
            results = make_json_serializable(results)
            return safe_jsonify({
                "count": len(results),
                "results": results
            })
        else:
            return jsonify({"error": "No species data available"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500
