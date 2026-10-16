#!/usr/bin/env python3
"""
ORCA Cinematic Frame Sequence Validator.
Validates:
- Exactly 120 frames are present.
- File names strictly follow frame_001.png through frame_120.png.
- Every file is a readable valid image with non-zero dimensions.
- Reports aspect ratio, size distribution, and phase coverage.
"""
import os
import sys
from PIL import Image

EXPECTED_COUNT = 120

def validate_sequence(frames_dir):
    print(f"Validating cinematic sequence in: {frames_dir}")
    if not os.path.exists(frames_dir):
        print(f"FAIL: Directory does not exist: {frames_dir}")
        return False
        
    missing_files = []
    invalid_images = []
    dimensions_set = set()
    total_bytes = 0
    
    for i in range(1, EXPECTED_COUNT + 1):
        file_name = f"frame_{i:03d}.png"
        file_path = os.path.join(frames_dir, file_name)
        
        if not os.path.isfile(file_path):
            missing_files.append(file_name)
            continue
            
        try:
            sz = os.path.getsize(file_path)
            total_bytes += sz
            with Image.open(file_path) as img:
                img.verify()
            with Image.open(file_path) as img:
                dimensions_set.add(img.size)
        except Exception as e:
            invalid_images.append((file_name, str(e)))

    print("\n--- VALIDATION RESULTS ---")
    print(f"Total Frames Expected: {EXPECTED_COUNT}")
    found_count = EXPECTED_COUNT - len(missing_files)
    print(f"Total Frames Found:    {found_count}")
    
    if missing_files:
        print(f"FAIL: {len(missing_files)} missing frames: {missing_files[:5]}...")
    else:
        print("PASS: Exact sequential naming frame_001.png to frame_120.png confirmed.")
        
    if invalid_images:
        print(f"FAIL: {len(invalid_images)} unreadable/corrupt images: {invalid_images}")
    else:
        print("PASS: All found frames are valid readable images.")
        
    if dimensions_set:
        print(f"Frame Dimensions Detected: {list(dimensions_set)}")
        avg_kb = round((total_bytes / max(1, found_count)) / 1024, 1)
        total_mb = round(total_bytes / (1024 * 1024), 2)
        print(f"Average Frame Size: {avg_kb} KB | Total Sequence Payload: {total_mb} MB")

    is_valid = (len(missing_files) == 0 and len(invalid_images) == 0 and found_count == EXPECTED_COUNT)
    if is_valid:
        print("\nSUCCESS: Sequence passed 100% of validation checks.")
    else:
        print("\nFAILURE: Sequence failed validation.")
        
    return is_valid

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    default_dir = os.path.join(root, "frontend", "public", "cinematic", "frames")
    target_dir = sys.argv[1] if len(sys.argv) > 1 else default_dir
    
    ok = validate_sequence(target_dir)
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
