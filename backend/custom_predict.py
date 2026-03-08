"""
Custom Mushroom Classifier - Prediction Module
================================================

Two-Stage Mushroom Identification System:
1. Detection Stage: Binary classification (Mushroom vs Not Mushroom)
2. Classification Stage: Multi-class identification (10 mushroom species)
3. Database Query: Fetch detailed species information from MongoDB

Models:
- Detector: ResNet50 trained on mushroom vs non-mushroom images
- Classifier: ResNet50 trained on 10 Filipino mushroom species

Data Flow:
1. Image preprocessing (resize, normalize)
2. Stage 1: Detect if mushroom is present (confidence threshold)
3. Stage 2: Classify mushroom species if detected
4. Query database for edibility and safety information
5. Return comprehensive prediction results
"""

import torch
import torch.nn as nn
import numpy as np
import cv2
import json
import os
import logging
from torchvision import transforms, models
from PIL import Image
import io
import base64
from typing import Dict, Tuple, Optional, List
from functools import lru_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
IMAGE_SIZE = 224
DETECTION_CONFIDENCE_THRESHOLD = 0.60  # Minimum confidence for mushroom detection
CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.30  # Minimum confidence for classification
MAX_TOP_PREDICTIONS = 3  # Number of top predictions to return


class MushroomClassifier(nn.Module):
    """ResNet50-based mushroom classifier"""
    
    def __init__(self, num_classes):
        super(MushroomClassifier, self).__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        # Match training architecture: Sequential with Dropout + Linear
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)


class CustomMushroomPredictor:
    """
    Two-Stage Mushroom Prediction System
    
    Architecture:
    1. Detection: Binary classifier (mushroom vs non-mushroom)
    2. Classification: Multi-class classifier (10 species)
    3. Database Integration: Fetch edibility and safety info
    
    Features:
    - Confidence thresholds for quality control
    - Top-K predictions for species classification
    - Automatic database lookup for species metadata
    - Comprehensive error handling and logging
    - Image preprocessing with normalization
    """
    
    def __init__(self, 
                 detector_path: str = "models/mushroom_detector.pt", 
                 classifier_path: str = "models/mushroom_classifier.pth", 
                 classes_path: str = "models/mushroom_classes.json",
                 enable_caching: bool = True):
        """
        Initialize predictor with models and configuration.
        
        Args:
            detector_path: Path to binary mushroom detector model
            classifier_path: Path to multi-class classifier model
            classes_path: Path to classes JSON file
            enable_caching: Enable species data caching for performance
        
        Raises:
            FileNotFoundError: If model files are not found
            RuntimeError: If model loading fails
        """
        # Resolve paths relative to backend directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.detector_path = os.path.join(script_dir, detector_path)
        self.classifier_path = os.path.join(script_dir, classifier_path)
        self.classes_path = os.path.join(script_dir, classes_path)
        
        # Model containers
        self.detector = None
        self.classifier = None
        self.classes = None
        self.class_to_id = None
        self.id_to_class = None
        
        # Configuration
        self.device = DEVICE
        self.enable_caching = enable_caching
        self._species_cache = {}  # Cache for database lookups
        
        # Load models and classes
        logger.info(f"Initializing CustomMushroomPredictor on device: {DEVICE}")
        self._load_detector()
        self._load_classifier()
        self._load_classes()
        logger.info("CustomMushroomPredictor initialized successfully")
    
    def _load_detector(self):
        """
        Load the YOLOv8 mushroom detector model.

        The detector is optional - if not found, the classifier still runs
        but all images are assumed to contain mushrooms.
        """
        if not os.path.exists(self.detector_path):
            logger.warning(f"Detector not found: {self.detector_path}")
            logger.warning("Skipping detection stage - all images assumed to contain mushrooms")
            return

        try:
            from ultralytics import YOLO as _YOLO
            self.detector = _YOLO(self.detector_path)
            logger.info(f"Detector loaded (YOLOv8): {self.detector_path}")
        except Exception as e:
            logger.warning(f"YOLOv8 detector failed to load: {e}")
            logger.warning("Skipping detection stage - all images assumed to contain mushrooms")
            self.detector = None
    
    def _load_classifier(self):
        """
        Load the multi-class mushroom classifier model.
        
        The classifier is REQUIRED for the system to function.
        
        Raises:
            FileNotFoundError: If classifier or classes file not found
            RuntimeError: If model loading fails
        """
        if not os.path.exists(self.classifier_path):
            raise FileNotFoundError(
                f"Classifier not found: {self.classifier_path}\n"
                f"Train the model using: python train_custom.py"
            )
        
        # Load classes first to determine number of output classes
        if not os.path.exists(self.classes_path):
            raise FileNotFoundError(
                f"Classes file not found: {self.classes_path}\n"
                f"Ensure mushroom_classes.json exists in models/ directory"
            )
        
        try:
            with open(self.classes_path, 'r') as f:
                classes_dict = json.load(f)

            # Support both plain list and structured dict formats
            if isinstance(classes_dict, list):
                class_names = classes_dict
            else:
                class_names = classes_dict['class_names']

            num_classes = len(class_names)
            logger.info(f"Loading classifier for {num_classes} classes")
            
            # Initialize classifier
            self.classifier = MushroomClassifier(num_classes=num_classes)
            
            # Load checkpoint
            checkpoint = torch.load(self.classifier_path, map_location=self.device, weights_only=False)
            
            # Handle different checkpoint formats
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                # Checkpoint saved with metadata
                logger.info("Loading model from checkpoint with metadata")
                state_dict = checkpoint['model_state_dict']
                if 'best_accuracy' in checkpoint:
                    logger.info(f"Model best accuracy: {checkpoint['best_accuracy']:.2%}")
            else:
                # Checkpoint is just the state dict
                logger.info("Loading model from plain state dict")
                state_dict = checkpoint
            
            # Handle key prefix mismatch: convert 'model.' to 'backbone.'
            # This allows loading models saved with different class attribute names
            fixed_state_dict = {}
            for key, value in state_dict.items():
                if key.startswith('model.'):
                    new_key = key.replace('model.', 'backbone.', 1)
                    fixed_state_dict[new_key] = value
                    logger.debug(f"Renamed key: {key} -> {new_key}")
                else:
                    fixed_state_dict[key] = value
            
            self.classifier.load_state_dict(fixed_state_dict)
            
            self.classifier.to(self.device)
            self.classifier.eval()
            
            logger.info(f"Classifier loaded successfully: {self.classifier_path}")
        except Exception as e:
            logger.error(f"Failed to load classifier: {e}")
            raise RuntimeError(f"Classifier loading failed: {e}")
    def _load_classes(self):
        """
        Load class names and ID mappings.
        
        Raises:
            FileNotFoundError: If classes file not found
            ValueError: If classes file format is invalid
        """
        if not os.path.exists(self.classes_path):
            raise FileNotFoundError(f"Classes file not found: {self.classes_path}")
        
        try:
            with open(self.classes_path, 'r') as f:
                classes_dict = json.load(f)

            # Support both plain list and structured dict formats
            if isinstance(classes_dict, list):
                self.classes = classes_dict
                self.class_to_id = {name: idx for idx, name in enumerate(classes_dict)}
                self.id_to_class = {str(idx): name for idx, name in enumerate(classes_dict)}
            else:
                # Validate required fields
                required_fields = ['class_names', 'class_to_idx', 'idx_to_class']
                for field in required_fields:
                    if field not in classes_dict:
                        raise ValueError(f"Missing required field '{field}' in classes file")
                self.classes = classes_dict['class_names']
                self.class_to_id = classes_dict['class_to_idx']
                self.id_to_class = classes_dict['idx_to_class']

            logger.info(f"Classes loaded: {len(self.classes)} mushroom species")
            logger.debug(f"Species: {', '.join(self.classes)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in classes file: {e}")
        except Exception as e:
            logger.error(f"Failed to load classes: {e}")
            raise
    
    def _decode_image(self, image_input) -> Image.Image:
        """
        Decode any supported input format to a PIL RGB image.
        Used by both the YOLO detector and the classifier preprocessor.
        """
        if isinstance(image_input, str):
            if image_input.startswith("data:image"):
                image_input = image_input.split(",")[1]
            image_data = base64.b64decode(image_input)
            return Image.open(io.BytesIO(image_data)).convert('RGB')
        elif isinstance(image_input, np.ndarray):
            if image_input.dtype != np.uint8:
                image_input = (image_input * 255).astype(np.uint8)
            return Image.fromarray(image_input).convert('RGB')
        elif isinstance(image_input, Image.Image):
            return image_input.convert('RGB')
        else:
            raise ValueError(f"Unsupported image type: {type(image_input)}")

    def _preprocess_image(self, pil_image: Image.Image) -> torch.Tensor:
        """
        Preprocess a PIL RGB image into a normalised tensor for the classifier.

        Processing steps:
        1. Resize to 224x224
        2. Convert to tensor
        3. Normalize using ImageNet statistics

        Args:
            pil_image: PIL RGB image

        Returns:
            Preprocessed tensor ready for model input (1, 3, 224, 224)
        """
        try:
            if pil_image.size[0] == 0 or pil_image.size[1] == 0:
                raise ValueError(f"Invalid image dimensions: {pil_image.size}")

            transform = transforms.Compose([
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])

            tensor = transform(pil_image).unsqueeze(0).to(self.device)
            logger.debug(f"Preprocessed tensor shape: {tensor.shape}")
            return tensor

        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise ValueError(f"Failed to preprocess image: {e}")
    
    def predict(self, image_input) -> Dict:
        """
        Main prediction pipeline: Detection → Classification → Database Lookup
        
        Pipeline Stages:
        1. Image Preprocessing: Resize, normalize, convert to tensor
        2. Detection: Binary classification (mushroom vs not mushroom)
        3. Classification: Multi-class identification (10 species)
        4. Database Query: Fetch edibility and safety information
        
        Args:
            image_input: Image in one of these formats:
                - base64 string (with or without data URI prefix)
                - numpy array (preferably uint8 RGB)
                - PIL Image object
        
        Returns:
            Dict with comprehensive prediction results:
            Success case:
            {
                "success": True,
                "detection": {
                    "found": bool,
                    "confidence": float,
                    "prediction": str
                },
                "classification": {
                    "label": str,
                    "confidence": float,
                    "top_predictions": List[Dict],
                    "toxicity_level": str,
                    "edible": bool
                },
                "message": str (optional)
            }
            
            Failure case:
            {
                "success": False,
                "error": str,
                "error_type": str
            }
        """
        try:
            logger.info("Starting mushroom prediction pipeline")

            # ============ DECODE IMAGE ============
            logger.info("Stage 0: Decoding image")
            pil_image = self._decode_image(image_input)

            # ============ STAGE 1: YOLO DETECTION ============
            logger.info("Stage 1: Mushroom detection (YOLOv8)")
            detection_result = self._detect_mushroom(pil_image)

            if not detection_result["found"]:
                logger.info("No mushroom detected - stopping pipeline")
                return {
                    "success": True,
                    "detection": detection_result,
                    "classification": None,
                    "message": (
                        "No mushroom detected in the image. "
                        "Please ensure the image shows a clear view of the mushroom."
                    )
                }

            # ============ STAGE 2: CLASSIFICATION ============
            logger.info("Stage 2: Species classification")
            image_tensor = self._preprocess_image(pil_image)
            classification_result = self._classify_mushroom(image_tensor)
            
            result = {
                "success": True,
                "detection": detection_result,
                "classification": classification_result
            }
            
            logger.info(f"Prediction complete: {classification_result['label']}")
            logger.info(f"Safety: {classification_result['toxicity_level']}")
            
            return result
        
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "validation_error"
            }
        except RuntimeError as e:
            logger.error(f"Runtime error: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "runtime_error"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Prediction failed: {str(e)}",
                "error_type": "unexpected_error"
            }
    
    def _detect_mushroom(self, pil_image: Image.Image) -> Dict:
        """
        Stage 1: YOLOv8 Detection - Mushroom vs Not Mushroom

        Runs the YOLOv8 model on the PIL image and checks whether any
        detection box exceeds DETECTION_CONFIDENCE_THRESHOLD.
        If the detector is not loaded, all images are assumed to contain
        a mushroom so the classifier can still run.

        Args:
            pil_image: PIL RGB image (any size - YOLO handles resizing internally)

        Returns:
            Dict with detection results:
            {
                "found": bool,
                "confidence": float,   # highest box confidence (0-1)
                "prediction": str,
                "boxes": int,          # number of detections above threshold
                "warning": str (optional)
            }
        """
        if self.detector is None:
            logger.debug("Detector not loaded, assuming mushroom present")
            return {
                "found": True,
                "confidence": None,
                "prediction": "Assumed Mushroom",
                "boxes": 0,
                "warning": "Detector not loaded - skipping detection stage"
            }

        try:
            # Run YOLOv8 inference (verbose=False suppresses per-image console output)
            results = self.detector(pil_image, verbose=False)
            result = results[0]  # single image

            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                logger.info("YOLO: no detections")
                return {
                    "found": False,
                    "confidence": 0.0,
                    "prediction": "Not a Mushroom",
                    "boxes": 0
                }

            # Confidence scores for all detections
            confidences = boxes.conf.cpu().tolist()  # list of floats
            max_conf = max(confidences)
            above_threshold = [c for c in confidences if c >= DETECTION_CONFIDENCE_THRESHOLD]

            is_mushroom = len(above_threshold) > 0

            detection = {
                "found": is_mushroom,
                "confidence": round(max_conf, 3),
                "prediction": "Mushroom" if is_mushroom else "Not a Mushroom",
                "boxes": len(above_threshold)
            }

            if not is_mushroom:
                detection["warning"] = (
                    f"Detected object(s) but max confidence {max_conf:.1%} "
                    f"is below threshold {DETECTION_CONFIDENCE_THRESHOLD:.0%}."
                )

            logger.info(f"YOLO detection: {detection['prediction']} "
                        f"(max_conf={max_conf:.3f}, boxes={len(above_threshold)})")
            return detection

        except Exception as e:
            logger.error(f"YOLO detection failed: {e}")
            return {
                "found": True,
                "confidence": None,
                "prediction": "Error - Assumed Mushroom",
                "boxes": 0,
                "warning": f"Detection error: {str(e)}"
            }
    
    def _classify_mushroom(self, image_tensor: torch.Tensor) -> Dict:
        """
        Stage 2: Multi-Class Classification - Identify Mushroom Species
        
        Classifies mushroom into one of 10 trained species categories.
        Returns top-K predictions with confidence scores.
        
        Species Classified:
        - Wood Ear, White Oyster, Enoki, Shiitake, Button (edible)
        - Death Cap, False Morel, Jack O'Lantern, Funeral Bell, Red Cage (poisonous)
        
        Args:
            image_tensor: Preprocessed image tensor (1, 3, 224, 224)
            
        Returns:
            Dict with classification results:
            {
                "label": str (predicted species),
                "confidence": float,
                "top_predictions": List[Dict] (top-K predictions),
                "toxicity_level": str ("SAFE" or "DANGEROUS"),
                "edible": bool,
                "warning": str (optional low confidence warning)
            }
        """
        try:
            with torch.no_grad():
                outputs = self.classifier(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, class_idx = torch.max(probabilities, 1)
            
            class_idx = class_idx.item()
            confidence = confidence.item()
            class_name = self.classes[class_idx]
            
            # Get top-K predictions
            k = min(MAX_TOP_PREDICTIONS, len(self.classes))
            top_probs, top_indices = torch.topk(probabilities[0], k)
            top_predictions = [
                {
                    "class": self.classes[idx.item()],
                    "confidence": round(prob.item(), 3)
                }
                for prob, idx in zip(top_probs, top_indices)
            ]
            
            # Query database for edibility (with caching)
            edibility = self._get_edibility(class_name)
            
            result = {
                "label": class_name,
                "confidence": round(confidence, 3),
                "top_predictions": top_predictions,
                "toxicity_level": "SAFE" if edibility else "DANGEROUS",
                "edible": edibility
            }
            
            # Add warning for low confidence predictions
            if confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD:
                result["warning"] = (
                    f"Low classification confidence ({confidence:.1%}). "
                    f"Consider manual verification by an expert."
                )
                logger.warning(f"Low confidence classification: {class_name} ({confidence:.3f})")
            
            logger.info(f"Classification: {class_name} (confidence: {confidence:.3f})")
            logger.debug(f"Top 3: {[p['class'] for p in top_predictions]}")
            
            return result
            
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            raise RuntimeError(f"Classification error: {e}")
    
    def _get_edibility(self, mushroom_name: str) -> bool:
        """
        Query database for mushroom edibility information.
        
        Implements caching to reduce database queries for frequently
        requested species.
        
        Safety Note:
        - Defaults to FALSE (poisonous) if database lookup fails
        - This is a safety-first approach - better to be overly cautious
        
        Args:
            mushroom_name: English name of mushroom species
            
        Returns:
            True if edible, False if poisonous or unknown
        """
        # Check cache first
        if self.enable_caching and mushroom_name in self._species_cache:
            logger.debug(f"Cache hit for species: {mushroom_name}")
            return self._species_cache[mushroom_name]
        
        try:
            from services.species_service import SpeciesService
            species_service = SpeciesService()
            
            # Search database by English name
            species_list = species_service.search_species(mushroom_name)
            
            if species_list and len(species_list) > 0:
                edible = species_list[0].get('edible', False)
                
                # Cache result
                if self.enable_caching:
                    self._species_cache[mushroom_name] = edible
                    logger.debug(f"Cached edibility for {mushroom_name}: {edible}")
                
                logger.info(f"Database lookup: {mushroom_name} is {'EDIBLE' if edible else 'POISONOUS'}")
                return edible
            else:
                logger.warning(f"No database entry found for: {mushroom_name}")
        
        except Exception as e:
            logger.error(f"Database lookup failed for '{mushroom_name}': {e}")
        
        # SAFETY FIRST: Default to poisonous if unknown
        logger.warning(f"Defaulting to POISONOUS for unknown species: {mushroom_name}")
        return False
    
    def clear_cache(self):
        """Clear species edibility cache."""
        self._species_cache.clear()
        logger.info("Species cache cleared")


def create_predictor():
    """
    Factory function to create a CustomMushroomPredictor instance.
    
    This is the recommended way to instantiate the predictor.
    
    Returns:
        CustomMushroomPredictor: Initialized predictor ready for inference
        
    Raises:
        FileNotFoundError: If required model files are missing
        RuntimeError: If model initialization fails
    """
    logger.info("Creating mushroom predictor instance")
    return CustomMushroomPredictor()


if __name__ == "__main__":
    # Test the predictor initialization
    print("===" * 20)
    print("Testing CustomMushroomPredictor Initialization")
    print("===" * 20)
    
    try:
        predictor = create_predictor()
        print("\n✅ SUCCESS: Predictor initialized successfully!")
        print(f"\nConfiguration:")
        print(f"  Device: {predictor.device}")
        print(f"  Detector: {'Loaded' if predictor.detector else 'Not loaded'}")
        print(f"  Classifier: {'Loaded' if predictor.classifier else 'Not loaded'}")
        print(f"  Species: {len(predictor.classes)} classes")
        print(f"  Caching: {'Enabled' if predictor.enable_caching else 'Disabled'}")
        print(f"\nModel Ready for Prediction!")
        
    except FileNotFoundError as e:
        print(f"\n❌ ERROR: Missing model files")
        print(f"   {e}")
        print(f"\n🛠️  To fix this:")
        print(f"   1. Train the classifier: python train_custom.py")
        print(f"   2. (Optional) Train detector: python train_mushroom_detector.py")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
