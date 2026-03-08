"""
Mushroom Prediction Pipeline - Complete System
===============================================

Two-Stage Deep Learning System:
1. Detection: YOLOv8 detects mushroom location (bounding boxes)
2. Classification: ResNet50 classifies mushroom species
3. Database: Fetches detailed species information

Models:
- Detector: YOLOv8 (models/mushroom_detector.pt)
- Classifier: ResNet50 (models/mushroom_classifier.pth)
- Classes: Mapping file (models/mushroom_classes.json)

Data Flow:
Image → YOLOv8 Detection → Crop Region → ResNet50 Classification → Database Query → Result

Usage:
    from predict import MushroomPredictor
    predictor = MushroomPredictor()
    result = predictor.predict(image_base64)
"""

import os
import sys
import json
import base64
import io
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms, models
from ultralytics import YOLO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURATION
# ==========================================
# Model paths
DETECTOR_PATH = "models/mushroom_detector.pt"  # YOLOv8 model
CLASSIFIER_PATH = "models/mushroom_classifier.pth"  # ResNet50 model
CLASSES_PATH = "models/mushroom_classes.json"

# Prediction thresholds
DETECTION_CONFIDENCE = 0.25  # YOLOv8 confidence threshold
CLASSIFICATION_CONFIDENCE = 0.30  # Minimum confidence for classification

# Image processing
IMAGE_SIZE = 224  # ResNet50 input size
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==========================================
# MODEL ARCHITECTURES
# ==========================================
class MushroomClassifier(nn.Module):
    """ResNet50-based mushroom species classifier"""
    
    def __init__(self, num_classes):
        super(MushroomClassifier, self).__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)

# ==========================================
# MAIN PREDICTOR CLASS
# ==========================================
class MushroomPredictor:
    """
    Complete mushroom identification system
    
    Features:
    - YOLOv8 detection for mushroom localization
    - ResNet50 classification for species identification
    - Database integration for metadata
    - Confidence thresholding for quality control
    - Top-K predictions support
    """
    
    def __init__(self,
                 detector_path: str = DETECTOR_PATH,
                 classifier_path: str = CLASSIFIER_PATH,
                 classes_path: str = CLASSES_PATH):
        """
        Initialize mushroom predictor
        
        Args:
            detector_path: Path to YOLOv8 detection model
            classifier_path: Path to ResNet50 classification model
            classes_path: Path to classes JSON file
        """
        logger.info(f"Initializing MushroomPredictor on device: {DEVICE}")
        
        # Resolve paths
        self.detector_path = detector_path
        self.classifier_path = classifier_path
        self.classes_path = classes_path
        
        # Model containers
        self.detector = None
        self.classifier = None
        self.class_names = []
        self.class_to_idx = {}
        self.idx_to_class = {}
        
        # Load models
        self._load_detector()
        self._load_classifier()
        self._load_classes()
        
        logger.info("MushroomPredictor initialized successfully")
    
    def _load_detector(self):
        """Load YOLOv8 detector model"""
        if not os.path.exists(self.detector_path):
            logger.warning(f"Detector not found: {self.detector_path}")
            logger.warning("Detection stage will be skipped - using full image for classification")
            logger.info("Train detector: python train_detection.py")
            return
        
        try:
            self.detector = YOLO(self.detector_path)
            logger.info(f"✓ Loaded YOLOv8 detector: {self.detector_path}")
        except Exception as e:
            logger.error(f"Failed to load detector: {e}")
            self.detector = None
    
    def _load_classifier(self):
        """Load ResNet50 classifier model"""
        if not os.path.exists(self.classifier_path):
            raise FileNotFoundError(
                f"Classifier not found: {self.classifier_path}\n"
                f"Train the model: python train_classification.py"
            )
        
        try:
            # Load checkpoint
            checkpoint = torch.load(self.classifier_path, map_location=DEVICE)
            
            # Get model parameters
            num_classes = checkpoint.get('num_classes', 10)
            
            # Initialize model
            self.classifier = MushroomClassifier(num_classes)
            self.classifier.load_state_dict(checkpoint['model_state_dict'])
            self.classifier.to(DEVICE)
            self.classifier.eval()
            
            logger.info(f"✓ Loaded ResNet50 classifier: {self.classifier_path}")
            logger.info(f"  Number of classes: {num_classes}")
        except Exception as e:
            logger.error(f"Failed to load classifier: {e}")
            raise RuntimeError(f"Classifier loading failed: {e}")
    
    def _load_classes(self):
        """Load class names and mappings"""
        if not os.path.exists(self.classes_path):
            logger.warning(f"Classes file not found: {self.classes_path}")
            logger.warning("Using generic class names")
            return
        
        try:
            with open(self.classes_path, 'r') as f:
                classes_dict = json.load(f)
            
            self.class_names = classes_dict.get('class_names', [])
            self.class_to_idx = classes_dict.get('class_to_idx', {})
            self.idx_to_class = classes_dict.get('idx_to_class', {})
            
            # Convert string keys to integers for idx_to_class
            if self.idx_to_class and isinstance(list(self.idx_to_class.keys())[0], str):
                self.idx_to_class = {int(k): v for k, v in self.idx_to_class.items()}
            
            logger.info(f"✓ Loaded {len(self.class_names)} mushroom species")
            logger.debug(f"  Species: {', '.join(self.class_names)}")
        except Exception as e:
            logger.error(f"Failed to load classes: {e}")
            self.class_names = []
            self.class_to_idx = {}
            self.idx_to_class = {}
    
    # ==========================================
    # IMAGE PREPROCESSING
    # ==========================================
    def _decode_image(self, image_input: Union[str, np.ndarray, Image.Image]) -> np.ndarray:
        """
        Decode image from various input formats
        
        Args:
            image_input: Base64 string, numpy array, or PIL Image
            
        Returns:
            Numpy array (BGR format for OpenCV)
        """
        try:
            if isinstance(image_input, str):
                # Base64 string
                if image_input.startswith("data:image"):
                    image_input = image_input.split(",")[1]
                
                image_data = base64.b64decode(image_input)
                image = Image.open(io.BytesIO(image_data)).convert('RGB')
                return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            elif isinstance(image_input, np.ndarray):
                # Numpy array (assume BGR)
                return image_input
            
            elif isinstance(image_input, Image.Image):
                # PIL Image
                return cv2.cvtColor(np.array(image_input.convert('RGB')), cv2.COLOR_RGB2BGR)
            
            else:
                raise ValueError(f"Unsupported image input type: {type(image_input)}")
        
        except Exception as e:
            logger.error(f"Image decoding failed: {e}")
            raise ValueError(f"Failed to decode image: {e}")
    
    def _preprocess_for_classification(self, image: Union[np.ndarray, Image.Image]) -> torch.Tensor:
        """
        Preprocess image for ResNet50 classification
        
        Args:
            image: BGR numpy array or PIL Image
            
        Returns:
            Preprocessed tensor (1, 3, 224, 224)
        """
        try:
            # Convert to PIL Image if numpy array
            if isinstance(image, np.ndarray):
                if image.shape[2] == 3:  # BGR to RGB
                    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(image)
            
            # Apply transforms
            transform = transforms.Compose([
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])
            
            tensor = transform(image).unsqueeze(0).to(DEVICE)
            return tensor
        
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            raise ValueError(f"Failed to preprocess image: {e}")
    
    # ==========================================
    # DETECTION STAGE (YOLOv8)
    # ==========================================
    def _detect_mushroom(self, image: np.ndarray) -> Dict:
        """
        Stage 1: Detect mushroom location using YOLOv8
        
        Args:
            image: BGR numpy array
            
        Returns:
            Detection result with bounding boxes and confidence
        """
        if self.detector is None:
            logger.debug("Detector not loaded - using full image")
            return {
                "found": True,
                "confidence": 1.0,
                "bbox": None,
                "full_image": True
            }
        
        try:
            # Run YOLOv8 detection
            results = self.detector(image, conf=DETECTION_CONFIDENCE, verbose=False)
            
            # Get first result
            result = results[0]
            
            # Check if any detections
            if len(result.boxes) == 0:
                logger.info("No mushroom detected in image")
                return {
                    "found": False,
                    "confidence": 0.0,
                    "bbox": None,
                    "message": "No mushroom detected. Please ensure the image shows a clear view of the mushroom."
                }
            
            # Get highest confidence detection
            boxes = result.boxes
            confidences = boxes.conf.cpu().numpy()
            best_idx = np.argmax(confidences)
            
            bbox = boxes.xyxy[best_idx].cpu().numpy().astype(int)
            confidence = float(confidences[best_idx])
            
            logger.info(f"Mushroom detected with confidence: {confidence:.3f}")
            logger.debug(f"Bounding box: {bbox}")
            
            return {
                "found": True,
                "confidence": confidence,
                "bbox": bbox.tolist(),
                "full_image": False
            }
        
        except Exception as e:
            logger.error(f"Detection failed: {e}")
            # Fallback to full image
            return {
                "found": True,
                "confidence": 0.0,
                "bbox": None,
                "full_image": True,
                "warning": f"Detection error: {str(e)}"
            }
    
    def _crop_detection(self, image: np.ndarray, bbox: List[int]) -> np.ndarray:
        """
        Crop detected mushroom region from image
        
        Args:
            image: BGR numpy array
            bbox: [x1, y1, x2, y2]
            
        Returns:
            Cropped image
        """
        x1, y1, x2, y2 = bbox
        
        # Add padding (10% of bbox size)
        width = x2 - x1
        height = y2 - y1
        pad_x = int(width * 0.1)
        pad_y = int(height * 0.1)
        
        # Apply padding with boundary checks
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(image.shape[1], x2 + pad_x)
        y2 = min(image.shape[0], y2 + pad_y)
        
        cropped = image[y1:y2, x1:x2]
        return cropped
    
    # ==========================================
    # CLASSIFICATION STAGE (ResNet50)
    # ==========================================
    def _classify_species(self, image: np.ndarray, top_k: int = 3) -> Dict:
        """
        Stage 2: Classify mushroom species using ResNet50
        
        Args:
            image: BGR numpy array (full image or cropped region)
            top_k: Number of top predictions to return
            
        Returns:
            Classification results with species and confidence
        """
        try:
            # Preprocess image
            image_tensor = self._preprocess_for_classification(image)
            
            # Run classification
            with torch.no_grad():
                outputs = self.classifier(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
            
            # Get top-K predictions
            top_probs, top_indices = torch.topk(probabilities[0], min(top_k, len(self.class_names)))
            
            # Convert to lists
            top_probs = top_probs.cpu().numpy()
            top_indices = top_indices.cpu().numpy()
            
            # Get top prediction
            top_class_idx = int(top_indices[0])
            top_confidence = float(top_probs[0])
            
            # Get class name
            if self.idx_to_class:
                species_name = self.idx_to_class.get(top_class_idx, f"Unknown_{top_class_idx}")
            elif top_class_idx < len(self.class_names):
                species_name = self.class_names[top_class_idx]
            else:
                species_name = f"Class_{top_class_idx}"
            
            # Build top predictions list
            top_predictions = []
            for idx, prob in zip(top_indices, top_probs):
                idx = int(idx)
                if self.idx_to_class:
                    name = self.idx_to_class.get(idx, f"Unknown_{idx}")
                elif idx < len(self.class_names):
                    name = self.class_names[idx]
                else:
                    name = f"Class_{idx}"
                
                top_predictions.append({
                    "species": name,
                    "confidence": float(prob)
                })
            
            logger.info(f"Classified as: {species_name} (confidence: {top_confidence:.3f})")
            
            # Check confidence threshold
            if top_confidence < CLASSIFICATION_CONFIDENCE:
                logger.warning(f"Low confidence: {top_confidence:.3f} < {CLASSIFICATION_CONFIDENCE}")
            
            return {
                "species": species_name,
                "english_name": species_name,  # Will be updated from database
                "confidence": top_confidence,
                "top_predictions": top_predictions
            }
        
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            raise RuntimeError(f"Classification failed: {e}")
    
    # ==========================================
    # MAIN PREDICTION PIPELINE
    # ==========================================
    def predict(self, image_input: Union[str, np.ndarray, Image.Image], 
                top_k: int = 3) -> Dict:
        """
        Complete prediction pipeline: Detection → Classification → Database
        
        Args:
            image_input: Image in base64, numpy array, or PIL Image format
            top_k: Number of top predictions to return
            
        Returns:
            Complete prediction results:
            {
                "success": True,
                "detection": {
                    "found": bool,
                    "confidence": float,
                    "bbox": [x1, y1, x2, y2] or None
                },
                "classification": {
                    "label": str,
                    "confidence": float,
                    "top_predictions": List[Dict]
                },
                "message": str (optional)
            }
        """
        try:
            logger.info("="*60)
            logger.info("Starting mushroom prediction pipeline")
            logger.info("="*60)
            
            # ==== STAGE 0: Image Decoding ====
            logger.info("Stage 0: Decoding image")
            image = self._decode_image(image_input)
            logger.info(f"Image shape: {image.shape}")
            
            # ==== STAGE 1: Detection ====
            logger.info("Stage 1: Mushroom detection (YOLOv8)")
            detection_result = self._detect_mushroom(image)
            
            if not detection_result["found"]:
                logger.info("No mushroom detected - stopping pipeline")
                return {
                    "success": True,
                    "detection": detection_result,
                    "classification": None,
                    "message": detection_result.get("message", "No mushroom detected")
                }
            
            # ==== STAGE 2: Crop Region ====
            if detection_result.get("bbox") is not None:
                logger.info("Cropping detected region")
                region = self._crop_detection(image, detection_result["bbox"])
            else:
                logger.info("Using full image (no detection bbox)")
                region = image
            
            # ==== STAGE 3: Classification ====
            logger.info("Stage 2: Species classification (ResNet50)")
            classification_result = self._classify_species(region, top_k=top_k)
            
            # ==== STAGE 4: Build Response ====
            result = {
                "success": True,
                "detection": detection_result,
                "classification": {
                    "label": classification_result["species"],
                    "confidence": classification_result["confidence"],
                    "top_predictions": classification_result["top_predictions"]
                }
            }
            
            # Add warnings for low confidence
            if classification_result["confidence"] < CLASSIFICATION_CONFIDENCE:
                result["message"] = (
                    f"Low confidence prediction ({classification_result['confidence']:.2%}). "
                    "Results may be unreliable. Consider consulting an expert."
                )
            
            logger.info(f"Prediction complete: {classification_result['species']}")
            logger.info("="*60)
            
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

# ==========================================
# GLOBAL INSTANCE
# ==========================================
_predictor_instance = None

def get_predictor() -> MushroomPredictor:
    """
    Get singleton predictor instance
    
    Returns:
        MushroomPredictor instance
    """
    global _predictor_instance
    
    if _predictor_instance is None:
        _predictor_instance = MushroomPredictor()
    
    return _predictor_instance

# ==========================================
# CONVENIENCE FUNCTION
# ==========================================
def predict_mushroom(image_input: Union[str, np.ndarray, Image.Image],
                    top_k: int = 3) -> Dict:
    """
    Convenience function for mushroom prediction
    
    Args:
        image_input: Image in base64, numpy array, or PIL Image format
        top_k: Number of top predictions to return
        
    Returns:
        Prediction results dictionary
    """
    predictor = get_predictor()
    return predictor.predict(image_input, top_k=top_k)

# ==========================================
# TESTING
# ==========================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print("MUSHROOM PREDICTION SYSTEM TEST")
    print("="*60)
    
    # Check if models exist
    detector_exists = os.path.exists(DETECTOR_PATH)
    classifier_exists = os.path.exists(CLASSIFIER_PATH)
    classes_exists = os.path.exists(CLASSES_PATH)
    
    print(f"\nDetector (YOLOv8): {'✓' if detector_exists else '✗'} {DETECTOR_PATH}")
    print(f"Classifier (ResNet50): {'✓' if classifier_exists else '✗'} {CLASSIFIER_PATH}")
    print(f"Classes mapping: {'✓' if classes_exists else '✗'} {CLASSES_PATH}")
    
    if not classifier_exists:
        print("\n❌ Classifier model not found!")
        print("   Train the model: python train_classification.py")
        sys.exit(1)
    
    # Initialize predictor
    try:
        print("\nInitializing predictor...")
        predictor = get_predictor()
        print("✓ Predictor initialized successfully")
        
        print(f"\nSystem ready!")
        print(f"  Device: {DEVICE}")
        print(f"  Detection: {'Enabled' if predictor.detector is not None else 'Disabled'}")
        print(f"  Classes: {len(predictor.class_names)}")
        
    except Exception as e:
        print(f"\n❌ Failed to initialize predictor: {e}")
        sys.exit(1)
