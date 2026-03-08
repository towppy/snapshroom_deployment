from flask import Blueprint, request, jsonify
from bson import ObjectId
from services.species_classifier import predict_species
from services.species_service import SpeciesService
from utils.json_encoder import safe_jsonify

species_bp = Blueprint("species", __name__)
species_service = SpeciesService()

@species_bp.route("/classify", methods=["POST"])
def classify_species():
    data = request.json
    features = data.get("features")

    species = predict_species(features)

    return safe_jsonify({
        "species": species
    })

# ========== SPECIES DATABASE ROUTES ==========

@species_bp.route('/all', methods=['GET'])
def get_all_species():
    """Get all mushroom species"""
    try:
        species_list = species_service.get_all_species()
        return jsonify({
            'success': True,
            'count': len(species_list),
            'species': species_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/<species_id>', methods=['GET'])
def get_species_by_id(species_id):
    """Get a specific mushroom species by ID"""
    try:
        species = species_service.get_species_by_id(species_id)
        if species:
            return jsonify({
                'success': True,
                'species': species
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Species not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/search', methods=['GET'])
def search_species():
    """Search species by name (English, local, or scientific)"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({
                'success': False,
                'message': 'Search query is required'
            }), 400
        
        species_list = species_service.search_species(query)
        return jsonify({
            'success': True,
            'count': len(species_list),
            'species': species_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/filter/edible', methods=['GET'])
def get_edible_species():
    """Get only edible mushroom species"""
    try:
        species_list = species_service.get_species_by_edibility(True)
        return jsonify({
            'success': True,
            'count': len(species_list),
            'species': species_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/filter/poisonous', methods=['GET'])
def get_poisonous_species():
    """Get poisonous mushroom species"""
    try:
        species_list = species_service.get_species_by_edibility(False)
        return jsonify({
            'success': True,
            'count': len(species_list),
            'species': species_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/location/<location>', methods=['GET'])
def get_species_by_location(location):
    """Get species by location"""
    try:
        species_list = species_service.get_species_by_location(location)
        return jsonify({
            'success': True,
            'count': len(species_list),
            'species': species_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('', methods=['POST'])
def add_species():
    """Add a new mushroom species (admin only)"""
    try:
        data = request.json
        species_id = species_service.add_species(data)
        return jsonify({
            'success': True,
            'message': 'Species added successfully',
            'species_id': species_id
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/<species_id>', methods=['PUT'])
def update_species(species_id):
    """Update a mushroom species (admin only)"""
    try:
        data = request.json
        success = species_service.update_species(species_id, data)
        if success:
            return jsonify({
                'success': True,
                'message': 'Species updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Species not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/<species_id>', methods=['DELETE'])
def delete_species(species_id):
    """Delete a mushroom species (admin only)"""
    try:
        success = species_service.delete_species(species_id)
        if success:
            return jsonify({
                'success': True,
                'message': 'Species deleted successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Species not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@species_bp.route('/initialize', methods=['POST'])
def initialize_species_data():
    """Initialize the species database with default data"""
    try:
        count = species_service.initialize_default_species()
        return jsonify({
            'success': True,
            'message': f'Successfully initialized {count} species',
            'count': count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
