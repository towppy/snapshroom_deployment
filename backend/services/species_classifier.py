import os
import pickle
import numpy as np
from PIL import Image
import torch
import torchvision.models as models
import torch.nn as nn
from torchvision import transforms
from typing import Dict, List, Optional, Tuple
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

class SpeciesClassifier:
    """
    Service for classifying mushroom species using machine learning models.
    Supports both traditional ML (Random Forest) and deep learning (PyTorch) approaches.
    """

    def __init__(self, model_path: str = None, csv_path: str = None):
        self.model_path = model_path or "models/species_model.pkl"
        self.model = None
        self.label_encoder = None
        self.species_names = []

        # Database service for species data
        from services.species_service import SpeciesService
        self.species_db = SpeciesService()

        # PyTorch model for fallback
        self.pytorch_model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self._load_models()

    def _load_models(self):
        """Load the trained models."""
        try:
            # Try to load sklearn model first
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.model = model_data['model']
                    self.label_encoder = model_data['label_encoder']
                    self.species_names = model_data.get('species_names', [])
                print(f"Loaded sklearn species model from {self.model_path}")
            else:
                print(f"Sklearn model not found at {self.model_path}, will use PyTorch fallback")
                self._load_pytorch_model()

        except Exception as e:
            print(f"Error loading sklearn model: {e}")
            self._load_pytorch_model()

    def _load_pytorch_model(self):
        """Load PyTorch model as fallback."""
        try:
            pytorch_path = "models/mushroom_edibility.pth"
            if os.path.exists(pytorch_path):
                self.pytorch_model = models.mobilenet_v2(pretrained=False)
                self.pytorch_model.classifier[1] = nn.Linear(1280, 2)  # Binary classification
                self.pytorch_model.load_state_dict(torch.load(pytorch_path, map_location=self.device))
                self.pytorch_model.eval().to(self.device)
                print(f"Loaded PyTorch model from {pytorch_path}")
            else:
                print("No models available for species classification")
        except Exception as e:
            print(f"Error loading PyTorch model: {e}")



    def _extract_features_from_image(self, image: Image.Image) -> np.ndarray:
        """Extract features from image for sklearn model."""
        # Resize image
        image = image.resize((224, 224))

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Convert to numpy array and flatten
        img_array = np.array(image).flatten()

        # Normalize pixel values
        img_array = img_array / 255.0

        return img_array.reshape(1, -1)

    def classify_species(self, image: Image.Image) -> Dict:
        """
        Classify mushroom species from image.

        Args:
            image: PIL Image object

        Returns:
            dict: Classification results with species info
        """
        if self.model is not None:
            # Use sklearn model
            features = self._extract_features_from_image(image)
            probabilities = self.model.predict_proba(features)[0]
            predicted_class = np.argmax(probabilities)

            if self.label_encoder:
                species_name = self.label_encoder.inverse_transform([predicted_class])[0]
            else:
                species_name = f"class_{predicted_class}"

            confidence = float(probabilities[predicted_class])

        elif self.pytorch_model is not None:
            # Fallback to PyTorch model (binary classification)
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.pytorch_model(img_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence = float(probabilities[0][predicted_class])

            # Map to species (limited for binary model)
            species_name = "edible_species" if predicted_class == 1 else "poisonous_species"

        else:
            return {
                "error": "No trained model available",
                "species": "unknown",
                "confidence": 0.0,
                "metadata": {}
            }

        # Get additional metadata from CSV
        metadata = self._get_species_metadata(species_name)

        return {
            "species": species_name,
            "scientific_name": metadata.get("scientific_name", species_name),
            "english_name": metadata.get("english_name", species_name),
            "local_name": metadata.get("local_name", species_name),
            "confidence": confidence,
            "metadata": metadata
        }

    def _get_species_metadata(self, species_name: str) -> Dict:
        """Get metadata for a species from database."""
        try:
            # Try to match by scientific name (convert spaces/underscores)
            scientific_match = species_name.replace('_', ' ').strip()
            species_list = self.species_db.search_species(scientific_match)
            
            if not species_list:
                # Try without spaces
                species_list = self.species_db.search_species(species_name.replace('_', ''))
            
            if species_list:
                species = species_list[0]
                return {
                    "mushroom_id": species.get('_id'),
                    "scientific_name": species.get('scientific_name'),
                    "english_name": species.get('english_name'),
                    "local_name": species.get('local_name'),
                    "edible": species.get('edible', False),
                    "poisonous": not species.get('edible', False),
                    "location": species.get('location'),
                    "habitat": species.get('habitat'),
                    "cap": species.get('cap'),
                    "gills": species.get('gills'),
                    "stem": species.get('stem'),
                    "spore_print": species.get('spore_print'),
                    "texture": species.get('texture'),
                    "season": species.get('season'),
                    "cultivated_wild": species.get('cultivated_wild'),
                    "notes": species.get('notes'),
                    "description": species.get('description')
                }
        except Exception as e:
            print(f"Error fetching species metadata from database: {e}")
        
        return {}

    def get_available_species(self) -> List[str]:
        """Get list of available species for classification."""
        if self.species_names:
            return self.species_names
        else:
            try:
                all_species = self.species_db.get_all_species()
                return [s.get('scientific_name') for s in all_species if s.get('scientific_name')]
            except:
                return []

    def train_model(self, dataset_path: str, save_path: str = None):
        """
        Train a new species classification model.
        This is a simple implementation - in production, you'd want more sophisticated feature extraction.
        """
        from datasets.mushroom_dataset import MushroomDataset

        print("Training species classification model...")

        # Load dataset
        dataset = MushroomDataset(dataset_path, self.csv_path, transform=self.transform, classification_type='species')

        if len(dataset) == 0:
            print("No training data available")
            return False

        # Extract features and labels
        features = []
        labels = []

        for i in range(len(dataset)):
            image, label, species = dataset[i]
            # Convert tensor back to PIL for feature extraction
            img_pil = transforms.ToPILImage()(image)
            feature_vector = self._extract_features_from_image(img_pil)
            features.append(feature_vector.flatten())
            labels.append(label)

        X = np.array(features)
        y = np.array(labels)

        print(f"Training with {len(X)} samples, {len(np.unique(y))} classes")

        # Train Random Forest
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X, y)

        # Create label encoder for species names
        self.label_encoder = LabelEncoder()
        self.species_names = dataset.species_names
        self.label_encoder.fit(self.species_names)

        # Save model
        save_path = save_path or self.model_path
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        model_data = {
            'model': self.model,
            'label_encoder': self.label_encoder,
            'species_names': self.species_names
        }

        with open(save_path, 'wb') as f:
            pickle.dump(model_data, f)

        print(f"Model saved to {save_path}")
        return True


# Global instance
species_classifier = SpeciesClassifier()

def predict_species(image: Image.Image):
    """
    Legacy function for backward compatibility.
    """
    return species_classifier.classify_species(image)
