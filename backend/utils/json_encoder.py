"""
JSON encoder utility to handle pandas/numpy types that aren't JSON serializable.
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, date
from decimal import Decimal

class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for pandas/numpy types."""
    
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (pd.Timestamp, datetime)):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, pd.Series):
            return obj.to_dict()
        elif isinstance(obj, pd.DataFrame):
            return obj.to_dict('records')
        elif pd.isna(obj):
            return None
        return super().default(obj)

def make_json_serializable(obj):
    """
    Recursively convert pandas/numpy types to native Python types.
    
    Args:
        obj: Object that may contain pandas/numpy types
        
    Returns:
        Object with all pandas/numpy types converted to native Python types
    """
    if isinstance(obj, dict):
        return {key: make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(make_json_serializable(item) for item in obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, pd.Series):
        return obj.to_dict()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict('records')
    elif pd.isna(obj):
        return None
    else:
        return obj

def safe_jsonify(data):
    """
    Safely convert data to JSON-serializable format and return Flask jsonify response.
    
    Args:
        data: Data to convert (may contain pandas/numpy types)
        
    Returns:
        Flask jsonify response
    """
    from flask import jsonify
    serializable_data = make_json_serializable(data)
    return jsonify(serializable_data)