from flask import Blueprint, jsonify, request, current_app
from flask_pymongo import PyMongo
import json

farms_bp = Blueprint('farms', __name__)

@farms_bp.route('/api/farms', methods=['GET'])
def get_farms():
    """
    Get all mushroom farms from database
    Query params:
        - type: Filter by farm type (optional)
    """
    try:
        mongo = current_app.mongo
        db = mongo.db
        
        # Get query parameters
        farm_type = request.args.get('type', 'farm')
        
        # Build query
        query = {'type': farm_type} if farm_type else {}
        
        # Fetch farms from database
        farms_cursor = db.farms.find(query)
        farms = []
        
        for farm in farms_cursor:
            # Convert ObjectId to string and format coordinates
            farms.append({
                'id': str(farm.get('id')),
                'name': farm.get('name'),
                'lat': float(farm.get('lat')),
                'lng': float(farm.get('lng')),
                'type': farm.get('type', 'farm'),
                'created_at': farm.get('created_at'),
                'updated_at': farm.get('updated_at')
            })
        
        return jsonify({
            'success': True,
            'count': len(farms),
            'farms': farms
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch farms'
        }), 500

@farms_bp.route('/api/farms/<farm_id>', methods=['GET'])
def get_farm(farm_id):
    """
    Get specific farm by ID
    """
    try:
        mongo = current_app.mongo
        db = mongo.db
        
        farm = db.farms.find_one({'id': farm_id})
        
        if not farm:
            return jsonify({
                'success': False,
                'message': 'Farm not found'
            }), 404
        
        return jsonify({
            'success': True,
            'farm': {
                'id': str(farm.get('id')),
                'name': farm.get('name'),
                'lat': float(farm.get('lat')),
                'lng': float(farm.get('lng')),
                'type': farm.get('type', 'farm'),
                'created_at': farm.get('created_at'),
                'updated_at': farm.get('updated_at')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch farm'
        }), 500
