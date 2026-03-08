

## Configuration Details

### BATCH_SIZE
- **32** (default): Good balance for most GPUs
- **16** or **8**: For limited GPU memory
- **64** or **128**: If you have high-end GPU

### EPOCHS
- **20** (default): Usually enough to converge
- **10**: Quick training, less accuracy
- **50+**: Better accuracy, but may overfit

### LEARNING_RATE
- **0.001** (default): Good for Adam optimizer
- **0.0001**: Slower learning, more stable
- **0.01**: Faster learning, may be unstable

---

## Troubleshooting

### Error: "No such file: mushrooms10kinds.csv"
- Make sure CSV is in the root directory
- Or update `DATASET_CSV` path in train_custom.py

### Error: "Images not found"
- Ensure `datasets/mushroom_dataset/` has images
- Or update `DATASET_DIR` path

### Out of Memory (CUDA)
- Reduce `BATCH_SIZE` to 16 or 8
- Reduce `IMAGE_SIZE` to 160

### Poor Accuracy
- Check image quality and variety
- Increase `EPOCHS` to 30-50
- Ensure proper class labels in CSV

---

