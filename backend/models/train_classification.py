"""
Mushroom Species Classification Training - PyTorch ResNet50
============================================================

Purpose: Train ResNet50 model to classify mushroom species
Dataset: Folder structure at datasets/classification/mushroom_classification.v1-1.folder/
Output: models/mushroom_classifier.pth (PyTorch model)
Classes: Based on english_name from database (Button Mushroom, Oyster Mushroom, etc.)

Dataset Structure:
    datasets/classification/mushroom_classification.v1-1.folder/
    ├── train/
    │   ├── Button Mushroom/
    │   ├── Death Cap/
    │   ├── Enoki Mushroom/
    │   └── ...
    ├── valid/
    │   ├── Button Mushroom/
    │   └── ...
    └── test/
        └── ...

Usage:
    python train_classification.py
    python train_classification.py --epochs 30 --batch 32
    python train_classification.py --resume  # Resume from checkpoint
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models, datasets
from tqdm import tqdm

# ==========================================
# CONFIGURATION
# ==========================================
DATASET_DIR = "datasets/classification/mushroom_classification.v1-1.folder"
OUTPUT_DIR = "models"
MODEL_PATH = os.path.join(OUTPUT_DIR, "mushroom_classifier.pth")
CLASSES_PATH = os.path.join(OUTPUT_DIR, "mushroom_classes.json")
CHECKPOINT_PATH = os.path.join(OUTPUT_DIR, "classifier_checkpoint.pth")
RESULTS_PATH = os.path.join(OUTPUT_DIR, "classification_results.json")

# Default hyperparameters
DEFAULT_EPOCHS = 5
DEFAULT_BATCH = 10
DEFAULT_LR = 0.001
IMAGE_SIZE = 224

# Device configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==========================================
# MODEL ARCHITECTURE
# ==========================================
class MushroomClassifier(nn.Module):
    """
    ResNet50-based mushroom species classifier
    
    Architecture:
    - Backbone: Pre-trained ResNet50 (ImageNet weights)
    - Modified FC layer for mushroom species classification
    - Dropout for regularization
    """
    
    def __init__(self, num_classes):
        super(MushroomClassifier, self).__init__()
        
        # Load pre-trained ResNet50
        self.backbone = models.resnet50(pretrained=True)
        
        # Replace final layer with custom classifier
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)

# ==========================================
# DATASET SETUP
# ==========================================
def get_data_transforms():
    """
    Get data augmentation and normalization transforms
    
    Training: Aggressive augmentation to prevent overfitting
    Validation: Only normalization
    """
    
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    return train_transform, val_transform

def load_datasets():
    """
    Load mushroom classification datasets from folder structure
    
    Returns:
        train_dataset, val_dataset, test_dataset, class_names, class_to_idx
    """
    
    print("\n" + "="*60)
    print("📂 Loading Datasets")
    print("="*60)
    
    # Check if dataset directory exists
    if not os.path.exists(DATASET_DIR):
        raise FileNotFoundError(f"Dataset directory not found: {DATASET_DIR}")
    
    print(f"Dataset directory: {DATASET_DIR}")
    
    # Get transforms
    train_transform, val_transform = get_data_transforms()
    
    # Load datasets using ImageFolder
    train_dir = os.path.join(DATASET_DIR, "train")
    valid_dir = os.path.join(DATASET_DIR, "valid")
    test_dir = os.path.join(DATASET_DIR, "test")
    
    # Check directories exist
    if not os.path.exists(train_dir):
        raise FileNotFoundError(f"Training directory not found: {train_dir}")
    
    if not os.path.exists(valid_dir):
        raise FileNotFoundError(f"Validation directory not found: {valid_dir}")
    
    # Load datasets
    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(valid_dir, transform=val_transform)
    
    # Check if test directory exists
    test_dataset = None
    if os.path.exists(test_dir):
        test_dataset = datasets.ImageFolder(test_dir, transform=val_transform)
    
    # Get class information
    class_names = train_dataset.classes
    class_to_idx = train_dataset.class_to_idx
    
    # Filter out "Unlabeled" class if present
    if "Unlabeled" in class_names:
        print("⚠️  Found 'Unlabeled' class - this will be included but consider removing it")
    
    # Print dataset statistics
    print(f"\n✅ Training samples: {len(train_dataset)}")
    print(f"✅ Validation samples: {len(val_dataset)}")
    if test_dataset:
        print(f"✅ Test samples: {len(test_dataset)}")
    
    print(f"\n🏷️  Found {len(class_names)} classes:")
    for i, class_name in enumerate(class_names):
        train_count = len([1 for _, label in train_dataset.samples if label == i])
        val_count = len([1 for _, label in val_dataset.samples if label == i])
        print(f"   [{i}] {class_name}: {train_count} train, {val_count} val")
    
    return train_dataset, val_dataset, test_dataset, class_names, class_to_idx

# ==========================================
# TRAINING FUNCTIONS
# ==========================================
def train_epoch(model, dataloader, criterion, optimizer, device):
    """Train for one epoch"""
    
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc="Training", leave=False)
    
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)
        
        # Forward pass
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        # Statistics
        running_loss += loss.item() * images.size(0)
        _, predicted = torch.max(outputs, 1)
        correct += (predicted == labels).sum().item()
        total += labels.size(0)
        
        # Update progress bar
        pbar.set_postfix({
            'loss': f'{loss.item():.4f}',
            'acc': f'{100 * correct / total:.2f}%'
        })
    
    epoch_loss = running_loss / total
    epoch_acc = 100 * correct / total
    
    return epoch_loss, epoch_acc

def validate(model, dataloader, criterion, device):
    """Validate the model"""
    
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        pbar = tqdm(dataloader, desc="Validation", leave=False)
        
        for images, labels in pbar:
            images, labels = images.to(device), labels.to(device)
            
            # Forward pass
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            # Statistics
            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()
            total += labels.size(0)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
            # Update progress bar
            pbar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{100 * correct / total:.2f}%'
            })
    
    epoch_loss = running_loss / total
    epoch_acc = 100 * correct / total
    
    return epoch_loss, epoch_acc, all_preds, all_labels

def save_checkpoint(model, optimizer, epoch, best_acc, class_names, class_to_idx, filepath):
    """Save training checkpoint"""
    
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'best_accuracy': best_acc,
        'class_names': class_names,
        'class_to_idx': class_to_idx
    }
    torch.save(checkpoint, filepath)

def load_checkpoint(model, optimizer, filepath):
    """Load training checkpoint"""
    
    if not os.path.exists(filepath):
        return 0, 0.0
    
    checkpoint = torch.load(filepath, map_location=DEVICE)
    model.load_state_dict(checkpoint['model_state_dict'])
    optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    
    return checkpoint['epoch'], checkpoint['best_accuracy']

# ==========================================
# MAIN TRAINING FUNCTION
# ==========================================
def train_classifier(epochs=DEFAULT_EPOCHS, batch_size=DEFAULT_BATCH, 
                    learning_rate=DEFAULT_LR, resume=False):
    """
    Train mushroom species classifier
    
    Args:
        epochs: Number of training epochs
        batch_size: Batch size
        learning_rate: Learning rate
        resume: Resume from checkpoint if available
    """
    
    print("\n" + "="*60)
    print("🍄 MUSHROOM SPECIES CLASSIFICATION TRAINING")
    print("="*60)
    print(f"Device: {DEVICE}")
    print(f"Epochs: {epochs}")
    print(f"Batch size: {batch_size}")
    print(f"Learning rate: {learning_rate}")
    print("="*60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load datasets
    try:
        train_dataset, val_dataset, test_dataset, class_names, class_to_idx = load_datasets()
    except Exception as e:
        print(f"\n❌ Error loading datasets: {e}")
        return
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset, 
        batch_size=batch_size, 
        shuffle=True, 
        num_workers=4,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset, 
        batch_size=batch_size, 
        shuffle=False, 
        num_workers=4,
        pin_memory=True
    )
    
    # Initialize model
    num_classes = len(class_names)
    model = MushroomClassifier(num_classes).to(DEVICE)
    
    print(f"\n🔧 Model: ResNet50-based Classifier")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"   Trainable: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    
    # Loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', factor=0.5, patience=5
    )
    
    # Resume from checkpoint if requested
    start_epoch = 0
    best_acc = 0.0
    
    if resume and os.path.exists(CHECKPOINT_PATH):
        print(f"\n🔄 Resuming from checkpoint: {CHECKPOINT_PATH}")
        start_epoch, best_acc = load_checkpoint(model, optimizer, CHECKPOINT_PATH)
        print(f"   Starting from epoch {start_epoch + 1}, best accuracy: {best_acc:.2f}%")
    
    # Training history
    history = {
        'train_loss': [],
        'train_acc': [],
        'val_loss': [],
        'val_acc': []
    }
    
    print("\n🚀 Starting training...")
    print("-" * 60)
    
    # Training loop
    for epoch in range(start_epoch, epochs):
        print(f"\nEpoch [{epoch + 1}/{epochs}]")
        
        # Train
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        
        # Validate
        val_loss, val_acc, val_preds, val_labels = validate(model, val_loader, criterion, DEVICE)
        
        # Update learning rate
        scheduler.step(val_acc)
        
        # Save history
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)
        
        # Print epoch summary
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            print(f"✅ New best accuracy! Saving model to {MODEL_PATH}")
            
            # Save model
            torch.save({
                'model_state_dict': model.state_dict(),
                'num_classes': num_classes,
                'class_names': class_names,
                'class_to_idx': class_to_idx,
                'best_accuracy': best_acc,
                'image_size': IMAGE_SIZE
            }, MODEL_PATH)
            
            # Save class names mapping
            with open(CLASSES_PATH, 'w') as f:
                json.dump({
                    'class_names': class_names,
                    'class_to_idx': class_to_idx,
                    'idx_to_class': {v: k for k, v in class_to_idx.items()}
                }, f, indent=2)
        
        # Save checkpoint
        save_checkpoint(model, optimizer, epoch, best_acc, class_names, class_to_idx, CHECKPOINT_PATH)
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETED!")
    print("="*60)
    print(f"Best Validation Accuracy: {best_acc:.2f}%")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Classes saved to: {CLASSES_PATH}")
    
    # Save training history
    with open(RESULTS_PATH, 'w') as f:
        json.dump({
            'history': history,
            'best_accuracy': best_acc,
            'num_classes': num_classes,
            'class_names': class_names,
            'final_epoch': epochs,
            'training_date': datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"Training history saved to: {RESULTS_PATH}")
    
    # Test evaluation if test set exists
    if test_dataset is not None:
        print("\n🔍 Evaluating on test set...")
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
        test_loss, test_acc, _, _ = validate(model, test_loader, criterion, DEVICE)
        print(f"Test Loss: {test_loss:.4f} | Test Acc: {test_acc:.2f}%")

def main():
    """Main function with argument parsing"""
    
    parser = argparse.ArgumentParser(description='Train Mushroom Species Classifier')
    parser.add_argument('--epochs', type=int, default=DEFAULT_EPOCHS, help='Number of epochs')
    parser.add_argument('--batch', type=int, default=DEFAULT_BATCH, help='Batch size')
    parser.add_argument('--lr', type=float, default=DEFAULT_LR, help='Learning rate')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    
    args = parser.parse_args()
    
    # Run training
    train_classifier(
        epochs=args.epochs,
        batch_size=args.batch,
        learning_rate=args.lr,
        resume=args.resume
    )

if __name__ == "__main__":
    main()
