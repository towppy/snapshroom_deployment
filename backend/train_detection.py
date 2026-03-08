"""
Mushroom Detection Training - YOLOv8
=====================================

Purpose: Train YOLOv8 model to detect mushroom locations in images (bounding boxes)
Dataset: YOLOv8 OBB format at datasets/detection/mushroom_detection.v1-1.yolov8-obb/
Output: models/mushroom_detector.pt (YOLOv8 model)

Usage:
    python train_detection.py
    python train_detection.py --epochs 50 --batch 16
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO
import torch
import yaml
import argparse
from datetime import datetime
import shutil
import random

# ==========================================
# CONFIGURATION
# ==========================================
DATASET_DIR = "datasets/detection/mushroom_detection.v1-1.yolov8-obb"
DATA_YAML = os.path.join(DATASET_DIR, "data.yaml")
OUTPUT_DIR = "models"
MODEL_NAME = "mushroom_detector.pt"
RUNS_DIR = "runs/detect"

# Default hyperparameters
DEFAULT_EPOCHS = 5
DEFAULT_BATCH = 10
DEFAULT_IMG_SIZE = 400
DEFAULT_MODEL = "yolov8n.pt"  # nano, small, medium, large, xlarge

# Device configuration
DEVICE = "0" if torch.cuda.is_available() else "cpu"

def split_dataset(train_split=0.8):
    """
    Split training data into train/validation sets if validation set doesn't exist
    
    Args:
        train_split: Percentage of data to use for training (default: 0.8 = 80%)
    """
    print("\n" + "="*60)
    print("📊 Creating Train/Validation Split")
    print("="*60)
    
    train_img_dir = os.path.join(DATASET_DIR, "train", "images")
    train_lbl_dir = os.path.join(DATASET_DIR, "train", "labels")
    val_img_dir = os.path.join(DATASET_DIR, "valid", "images")
    val_lbl_dir = os.path.join(DATASET_DIR, "valid", "labels")
    
    # Create validation directories
    os.makedirs(val_img_dir, exist_ok=True)
    os.makedirs(val_lbl_dir, exist_ok=True)
    
    # Get all image files
    image_files = [f for f in os.listdir(train_img_dir) if f.endswith(('.jpg', '.png', '.jpeg'))]
    
    if not image_files:
        print("❌ No images found in training directory")
        return False
    
    # Shuffle and split
    random.seed(42)  # For reproducibility
    random.shuffle(image_files)
    
    split_idx = int(len(image_files) * train_split)
    train_files = image_files[:split_idx]
    val_files = image_files[split_idx:]
    
    print(f"📁 Total images: {len(image_files)}")
    print(f"📁 Training set: {len(train_files)} ({train_split*100:.0f}%)")
    print(f"📁 Validation set: {len(val_files)} ({(1-train_split)*100:.0f}%)")
    
    # Move validation files
    print("\n🔄 Moving files to validation set...")
    moved_count = 0
    for img_file in val_files:
        # Move image
        src_img = os.path.join(train_img_dir, img_file)
        dst_img = os.path.join(val_img_dir, img_file)
        shutil.move(src_img, dst_img)
        
        # Move corresponding label file
        label_file = os.path.splitext(img_file)[0] + '.txt'
        src_lbl = os.path.join(train_lbl_dir, label_file)
        dst_lbl = os.path.join(val_lbl_dir, label_file)
        
        if os.path.exists(src_lbl):
            shutil.move(src_lbl, dst_lbl)
        
        moved_count += 1
        if moved_count % 100 == 0:
            print(f"   Moved {moved_count}/{len(val_files)} files...")
    
    print(f"✅ Dataset split complete!")
    print(f"   Training: {len(train_files)} images in {train_img_dir}")
    print(f"   Validation: {len(val_files)} images in {val_img_dir}")
    
    return True

def check_dataset():
    """Verify dataset structure and configuration"""
    print("\n" + "="*60)
    print("📂 Checking Dataset Configuration")
    print("="*60)
    
    # Check if dataset directory exists
    if not os.path.exists(DATASET_DIR):
        print(f"❌ Dataset directory not found: {DATASET_DIR}")
        print("   Please ensure your dataset is extracted in the correct location.")
        return False
    
    # Check if data.yaml exists
    if not os.path.exists(DATA_YAML):
        print(f"❌ data.yaml not found: {DATA_YAML}")
        return False
    
    # Load and verify data.yaml
    with open(DATA_YAML, 'r') as f:
        data_config = yaml.safe_load(f)
    
    print(f"✅ Dataset directory: {DATASET_DIR}")
    print(f"✅ Configuration file: {DATA_YAML}")
    
    # Check for required splits
    train_dir = os.path.join(DATASET_DIR, "train", "images")
    val_dir = os.path.join(DATASET_DIR, "valid", "images")
    
    if os.path.exists(train_dir):
        train_images = len([f for f in os.listdir(train_dir) if f.endswith(('.jpg', '.png', '.jpeg'))])
        print(f"✅ Training images: {train_images}")
    else:
        print(f"⚠️  Training directory not found: {train_dir}")
        train_images = 0
    
    if os.path.exists(val_dir):
        val_images = len([f for f in os.listdir(val_dir) if f.endswith(('.jpg', '.png', '.jpeg'))])
        print(f"✅ Validation images: {val_images}")
    else:
        print(f"⚠️  Validation directory not found: {val_dir}")
        val_images = 0
        
        # Automatically split dataset if validation set is missing but training set exists
        if train_images > 0:
            print("\n💡 Validation set missing. Automatically splitting training data...")
            if split_dataset(train_split=0.8):
                # Re-check after split
                val_images = len([f for f in os.listdir(val_dir) if f.endswith(('.jpg', '.png', '.jpeg'))])
                train_images = len([f for f in os.listdir(train_dir) if f.endswith(('.jpg', '.png', '.jpeg'))])
                print(f"\n✅ After split:")
                print(f"   Training images: {train_images}")
                print(f"   Validation images: {val_images}")
            else:
                print("❌ Failed to create train/val split")
                return False
    
    # Print class information
    names = data_config.get('names', [])
    if isinstance(names, dict):
        names = list(names.values())
    print(f"✅ Classes: {', '.join(names)}")
    
    if train_images == 0:
        print("\n❌ No training images found. Cannot proceed.")
        return False
    
    return True

def update_yaml_paths():
    """Update data.yaml with absolute paths"""
    with open(DATA_YAML, 'r') as f:
        data_config = yaml.safe_load(f)
    
    # Convert to absolute paths
    dataset_abs = os.path.abspath(DATASET_DIR)
    
    # Update paths
    data_config['train'] = os.path.join(dataset_abs, 'train', 'images')
    data_config['val'] = os.path.join(dataset_abs, 'valid', 'images')
    
    if 'test' in data_config:
        data_config['test'] = os.path.join(dataset_abs, 'test', 'images')
    
    # Save updated yaml to a temporary file
    temp_yaml = os.path.join(DATASET_DIR, "data_abs.yaml")
    with open(temp_yaml, 'w') as f:
        yaml.dump(data_config, f, default_flow_style=False)
    
    print(f"✅ Updated paths in: {temp_yaml}")
    return temp_yaml

def train_detector(epochs=DEFAULT_EPOCHS, batch=DEFAULT_BATCH, img_size=DEFAULT_IMG_SIZE, 
                   model_size=DEFAULT_MODEL, resume=False):
    """
    Train YOLOv8 detector for mushroom detection
    
    Args:
        epochs: Number of training epochs
        batch: Batch size
        img_size: Input image size
        model_size: YOLOv8 model size (yolov8n.pt, yolov8s.pt, yolov8m.pt, etc.)
        resume: Resume from last checkpoint
    """
    
    print("\n" + "="*60)
    print("🍄 MUSHROOM DETECTION TRAINING (YOLOv8)")
    print("="*60)
    print(f"Model: {model_size}")
    print(f"Device: {DEVICE}")
    print(f"Epochs: {epochs}")
    print(f"Batch size: {batch}")
    print(f"Image size: {img_size}")
    print("="*60)
    
    # Verify dataset
    if not check_dataset():
        print("\n❌ Dataset verification failed. Exiting.")
        return
    
    # Update yaml with absolute paths
    yaml_path = update_yaml_paths()
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load YOLOv8 model
    print(f"\n🔄 Loading YOLOv8 model: {model_size}")
    model = YOLO(model_size)
    
    # Training parameters
    training_args = {
        'data': yaml_path,
        'epochs': epochs,
        'batch': batch,
        'imgsz': img_size,
        'device': DEVICE,
        'project': RUNS_DIR,
        'name': f'train_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
        'exist_ok': True,
        'pretrained': True,
        'optimizer': 'Adam',
        'verbose': True,
        'patience': 20,  # Early stopping patience
        'save': True,
        'save_period': 10,  # Save checkpoint every 10 epochs
        'cache': False,  # Cache images for faster training (use True if enough RAM)
        'workers': 4,
        'resume': resume
    }
    
    print("\n🚀 Starting training...")
    print("-" * 60)
    
    try:
        # Train the model
        results = model.train(**training_args)
        
        print("\n" + "="*60)
        print("✅ TRAINING COMPLETED!")
        print("="*60)
        
        # Get the best model path
        best_model_path = os.path.join(RUNS_DIR, training_args['name'], 'weights', 'best.pt')
        
        if os.path.exists(best_model_path):
            # Copy best model to models directory
            output_path = os.path.join(OUTPUT_DIR, MODEL_NAME)
            import shutil
            shutil.copy2(best_model_path, output_path)
            print(f"✅ Best model saved to: {output_path}")
            print(f"   Training results: {os.path.join(RUNS_DIR, training_args['name'])}")
            
            # Validate the model
            print("\n🔍 Running validation...")
            metrics = model.val()
            print(f"   mAP50: {metrics.box.map50:.4f}")
            print(f"   mAP50-95: {metrics.box.map:.4f}")
        else:
            print(f"⚠️  Best model not found at: {best_model_path}")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Main training function with argument parsing"""
    parser = argparse.ArgumentParser(description='Train YOLOv8 Mushroom Detector')
    parser.add_argument('--epochs', type=int, default=DEFAULT_EPOCHS, help='Number of epochs')
    parser.add_argument('--batch', type=int, default=DEFAULT_BATCH, help='Batch size')
    parser.add_argument('--img-size', type=int, default=DEFAULT_IMG_SIZE, help='Input image size')
    parser.add_argument('--model', type=str, default=DEFAULT_MODEL, 
                        choices=['yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt', 'yolov8x.pt'],
                        help='YOLOv8 model size')
    parser.add_argument('--resume', action='store_true', help='Resume from last checkpoint')
    
    args = parser.parse_args()
    
    # Run training
    train_detector(
        epochs=args.epochs,
        batch=args.batch,
        img_size=args.img_size,
        model_size=args.model,
        resume=args.resume
    )

if __name__ == "__main__":
    main()
