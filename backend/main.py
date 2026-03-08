# main.py - Entry point for training and testing
from datasets.mushroom_dataset import MushroomDataset, create_data_loaders
import torch
import os

if __name__ == "__main__":
    # Test dataset loading
    dataset_path = "dataset"
    csv_path = "mushrooms.csv"

    if os.path.exists(dataset_path):
        print("Testing dataset loading...")

        # Test edibility classification
        train_loader, test_loader, train_dataset, test_dataset = create_data_loaders(
            dataset_path, csv_path, classification_type='edibility'
        )

        print(f"Edibility dataset: {len(train_dataset)} train, {len(test_dataset)} test samples")
        print(f"Class distribution: {train_dataset.get_class_distribution()}")

        # Test species classification
        train_loader_species, test_loader_species, train_dataset_species, test_dataset_species = create_data_loaders(
            dataset_path, csv_path, classification_type='species'
        )

        print(f"Species dataset: {len(train_dataset_species)} train, {len(test_dataset_species)} test samples")
        print(f"Species classes: {train_dataset_species.class_names}")

        print("Dataset loading test completed!")
    else:
        print(f"Dataset path {dataset_path} not found. Please ensure your dataset is in the correct location.")