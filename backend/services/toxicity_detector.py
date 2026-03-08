import os
import torch
import torchvision.models as models
import torch.nn as nn
from torchvision import transforms
from PIL import Image
from typing import Dict, Optional
import pandas as pd
import numpy as np

class ToxicityDetector:
    """
    Service for detecting mushroom toxicity (edible vs poisonous) using deep learning.
    """

    def __init__(self, model_path: str = None, csv_path: str = None):
        self.model_path = model_path or "models/mushroom_edibility.pth"
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Database service for species data
        from services.species_service import SpeciesService
        self.species_db = SpeciesService()

        # Image preprocessing (same as training)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self._load_model()

    def _load_model(self):
        """Load the trained PyTorch model."""
        try:
            if os.path.exists(self.model_path):
                try:
                    self.model = models.mobilenet_v2(weights=None)
                except TypeError:
                    self.model = models.mobilenet_v2(pretrained=False)
                self.model.classifier[1] = nn.Linear(1280, 2)  # Binary classification
                self.model.load_state_dict(torch.load(self.model_path, map_location=self.device))
                self.model.eval().to(self.device)
                print(f"Loaded toxicity detection model from {self.model_path}")
            else:
                print(f"Model not found at {self.model_path}")
        except Exception as e:
            print(f"Error loading toxicity model: {e}")
            self.model = None



    def detect_toxicity(self, image: Image.Image) -> Dict:
        """
        Detect if mushroom is edible or poisonous.

        Args:
            image: PIL Image object

        Returns:
            dict: Toxicity detection results
        """
        if self.model is None:
            return {
                "toxicity_status": "unknown",
                "edible": False,
                "poisonous": False,
                "confidence": 0.0,
                "warning": "No trained model available"
            }

        try:
            # Preprocess image
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Make prediction
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence = float(probabilities[0][predicted_class])

            # Interpret results
            is_edible = predicted_class == 1  # Label 1 = edible
            is_poisonous = predicted_class == 0  # Label 0 = poisonous

            result = {
                "toxicity_status": "edible" if is_edible else "poisonous",
                "edible": is_edible,
                "poisonous": is_poisonous,
                "confidence": confidence,
                "risk_level": self._calculate_risk_level(confidence, is_poisonous)
            }

            # Add warnings for high-risk cases
            if is_poisonous and confidence > 0.8:
                result["warning"] = "High confidence poisonous mushroom detected. DO NOT CONSUME!"
            elif confidence < 0.6:
                result["warning"] = "Low confidence prediction. Consider consulting an expert."

            return result

        except Exception as e:
            print(f"Error during toxicity detection: {e}")
            return {
                "toxicity_status": "error",
                "edible": False,
                "poisonous": False,
                "confidence": 0.0,
                "error": str(e)
            }

    def _calculate_risk_level(self, confidence: float, is_poisonous: bool) -> str:
        """Calculate risk level based on confidence and toxicity."""
        if is_poisonous:
            if confidence > 0.9:
                return "extreme"
            elif confidence > 0.8:
                return "high"
            elif confidence > 0.6:
                return "medium"
            else:
                return "low"
        else:
            # For edible mushrooms, risk is lower
            if confidence > 0.8:
                return "low"
            elif confidence > 0.6:
                return "medium"
            else:
                return "high"  # High uncertainty about edibility

    def get_toxicity_info_by_species(self, species_name: str) -> Optional[Dict]:
        """Get toxicity information for a specific species from CSV."""
        if self.csv_data is None:
            return None

        # Find matching species
        matching_rows = self.csv_data[
            self.csv_data['scientific_name'].str.lower() == species_name.lower()
        ]

        if len(matching_rows) == 0:
            # Try partial match
            matching_rows = self.csv_data[
                self.csv_data['scientific_name'].str.lower().str.contains(species_name.lower())
            ]

        if len(matching_rows) > 0:
            row = matching_rows.iloc[0]
            # Convert pandas types to native Python types
            def safe_get(key, default=None):
                val = row.get(key, default)
                if pd.isna(val):
                    return default
                if isinstance(val, (np.integer, np.int64, np.int32)):
                    return int(val)
                if isinstance(val, (np.floating, np.float64, np.float32)):
                    return float(val)
                return val
            
            return {
                "species": species_name,
                "edible": bool(safe_get("edible", False)),
                "poisonous": bool(safe_get("poisonous", False)),
                "notes": str(safe_get("notes", "")),
                "english_name": str(safe_get("english_name", "")),
                "local_name": str(safe_get("local_name", ""))
            }

        return None

    def get_dangerous_species(self) -> list:
        """Get list of known dangerous species from CSV."""
        if self.csv_data is None:
            return []

        dangerous = self.csv_data[self.csv_data['poisonous'] == True]
        return dangerous[['scientific_name', 'english_name', 'local_name', 'notes']].to_dict('records')


# Global instance
toxicity_detector = ToxicityDetector()

def detect_toxicity(image: Image.Image):
    """
    Legacy function for backward compatibility.
    """
    return toxicity_detector.detect_toxicity(image)
