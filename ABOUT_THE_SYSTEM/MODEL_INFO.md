# 🍄 SnapShroom - Model Information

USED PYTORCH ON BOTH MODELS
pytorch via ultralytics
Framework: Ultralytics YOLOv8
## 📁 Key Paths

### Models
- **Detection Model**: `backend/models/mushroom_detector.pt` (YOLOv8)
- **Classification Model**: `backend/models/mushroom_classifier.pth` (ResNet50)
- **Classes Mapping**: `backend/models/mushroom_classes.json`

### Datasets
- **Detection Dataset**: `backend/datasets/detection/mushroom_detection.v1-1.yolov8-obb/`
  - Training: 3,393 images (80%)
  - Validation: 848 images (20%)
  
- **Classification Dataset**: `backend/datasets/classification/mushroom_classification.v1-1.folder/`
  - Training: 4,941 images
  - Validation: 844 images
  - Classes: 10 mushroom species

---

## 🤖 Model Types

### Detection Model
- **Framework**: Ultralytics YOLOv8n
- **Type**: Object Detection
- **Task**: Locate mushroom in image
- **Input**: 640x640 RGB image
- **Output**: Bounding box coordinates (x, y, width, height)
- **Training**: `python train_detection.py --epochs 50 --batch 16`

### Classification Model
- **Framework**: PyTorch ResNet50
- **Type**: Image Classification
- **Task**: Identify mushroom species
- **Input**: 224x224 RGB image (cropped mushroom)
- **Output**: Species class + confidence score
- **Training**: `python train_classification.py --epochs 30 --batch 32`

---

## 🏗️ Model Architecture

### Two-Stage Detection → Classification Pipeline

```
┌─────────────────────────────────────────────────────────┐
│ INPUT: Mushroom Photo                                   │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STAGE 1: DETECTION (YOLOv8n)                            │
│ - Input: Full image (640x640)                           │
│ - Task: Locate mushroom in image                        │
│ - Output: Bounding box coordinates                      │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ CROP: Extract mushroom region                           │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STAGE 2: CLASSIFICATION (ResNet50)                      │
│ - Input: Cropped mushroom (224x224)                     │
│ - Backbone: Pre-trained ResNet50 (ImageNet)             │
│ - Task: Identify mushroom species                       │
│ - Output: 10 species classes + confidence               │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ OUTPUT: Species Name + Edibility + Confidence           │
│ Example: "Death Cap (Poisonous) - 95.2% confidence"     │
└─────────────────────────────────────────────────────────┘
```

### YOLOv8n Detection Architecture

```
Input (640x640x3)
    ↓
Backbone: CSPDarknet53
    ├─ Conv + BatchNorm + SiLU
    ├─ C2f Blocks (feature extraction)
    └─ SPPF (spatial pyramid pooling)
    ↓
Neck: PAN-FPN
    ├─ Feature Pyramid Network
    └─ Path Aggregation Network
    ↓
Head: Detect
    ├─ Bounding Box Regression
    ├─ Object Classification
    └─ DFL (Distribution Focal Loss)
    ↓
Output: [boxes, confidence, class]
```

### ResNet50 Classification Architecture

```
Input (224x224x3)
    ↓
ResNet50 Backbone (Pre-trained on ImageNet)
    ├─ Conv1: 7x7 conv, 64 filters
    ├─ MaxPool: 3x3, stride 2
    ├─ Layer1: 3 bottleneck blocks (64→256 channels)
    ├─ Layer2: 4 bottleneck blocks (128→512 channels)
    ├─ Layer3: 6 bottleneck blocks (256→1024 channels)
    └─ Layer4: 3 bottleneck blocks (512→2048 channels)
    ↓
Global Average Pooling
    ↓
Dropout (p=0.5)
    ↓
Fully Connected Layer (2048 → 10 classes)
    ↓
Softmax Activation
    ↓
Output: [10 class probabilities]
```

---

## 🏷️ Classification Classes (10 Species)

| ID | Species Name       | Edibility  | Database Match     |
|----|-------------------|------------|-------------------|
| 0  | Button Mushroom   | Edible     | Button Mushroom   |
| 1  | Death Cap         | Poisonous  | Death Cap         |
| 2  | Enoki             | Edible     | Enoki Mushroom    |
| 3  | False Morel       | Poisonous  | False Morel       |
| 4  | Funeral Bell      | Poisonous  | Funeral Bell      |
| 5  | Jack O Lantern    | Poisonous  | Jack O Lantern    |
| 6  | Oyster            | Edible     | Oyster Mushroom   |
| 7  | Red Cage          | Edible     | Red Cage          |
| 8  | Shiitake          | Edible     | Shiitake          |
| 9  | Wood Ear          | Edible     | Wood Ear          |

**Note**: Class names match the `english_name` field in MongoDB database

---

## 🔄 Complete Workflow

```
User takes photo
    ↓
Frontend uploads to Cloudinary
    ↓
POST /api/toxicity/predict
    ↓
Backend loads mushroom_detector.pt
    ↓
YOLOv8 detects mushroom location
    ↓
Crop mushroom region from image
    ↓
Backend loads mushroom_classifier.pth
    ↓
ResNet50 classifies species
    ↓
Query MongoDB for full species info
    ↓
Save scan to mushroom_scans collection
    ↓
Return: {
  mushroom_type: "Death Cap",
  confidence: 0.952,
  edibility: "Poisonous",
  toxicity_level: "high",
  coordinates: {x, y, w, h}
}
    ↓
Frontend displays result + safety warning
```

---

## 🎯 Model Performance Targets

### Detection (YOLOv8n)
- **mAP50**: > 0.70 (70% accuracy at 50% IoU threshold)
- **mAP50-95**: > 0.50 (50% average across all IoU thresholds)
- **Inference Speed**: ~50-100ms per image (CPU)

### Classification (ResNet50)
- **Top-1 Accuracy**: > 85% (correct species in top prediction)
- **Top-3 Accuracy**: > 95% (correct species in top 3 predictions)
- **Inference Speed**: ~30-60ms per image (CPU)

---

## 📊 Training Metrics

### Detection Training
- **Epochs**: 5-50 (default: 5)
- **Batch Size**: 10-16 (default: 10)
- **Learning Rate**: 0.01 (Adam optimizer)
- **Loss Functions**:
  - Box Loss: Bounding box accuracy (target: < 1.2)
  - Class Loss: Object classification (target: < 0.8)
  - DFL Loss: Box distribution (target: < 1.5)

### Classification Training
- **Epochs**: 5-30 (default: 5)
- **Batch Size**: 10-32 (default: 10)
- **Learning Rate**: 0.001 (Adam optimizer)
- **Loss Function**: CrossEntropyLoss
- **Metrics**: Accuracy, Precision, Recall, F1-Score per class

---

## 💾 Model Files

### mushroom_detector.pt (~6MB)
- YOLOv8n weights
- Single-class detection ("mushroom")
- PyTorch format

### mushroom_classifier.pth (~100MB)
- ResNet50 weights
- 10-class classification
- PyTorch state_dict format

### mushroom_classes.json
```json
{
  "class_names": [
    "Button Mushroom",
    "Death Cap",
    "Enoki",
    ...
  ],
  "class_to_idx": {
    "Button Mushroom": 0,
    "Death Cap": 1,
    ...
  },
  "idx_to_class": {
    "0": "Button Mushroom",
    "1": "Death Cap",
    ...
  }
}
```
