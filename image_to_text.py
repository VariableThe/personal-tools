#!/usr/bin/env python3
"""
PNG / Image to Text OCR Converter (Command Line Tool)

Extracts optical character text from image files (PNG, JPG, WEBP).
Requires: pytesseract and Pillow (pip install pytesseract Pillow)
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Error: Required libraries not found. Please run: pip install pytesseract Pillow", file=sys.stderr)
    sys.exit(1)


def extract_text_from_image(img_path: Path, output_file: Path = None) -> str:
    if not img_path.exists():
        print(f"Error: Image file '{img_path}' not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Performing OCR on '{img_path}'...")
    img = Image.open(img_path)
    text = pytesseract.image_to_string(img)

    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extracted text saved to: {output_file}")
    else:
        print("\n--- Extracted Text ---")
        print(text.strip())
        print("----------------------\n")

    return text


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract text from images using optical character recognition (OCR).")
    parser.add_argument("input", type=Path, help="Path to input image file (.png, .jpg, etc.)")
    parser.add_argument("-o", "--output", type=Path, default=None, help="File to save extracted text (.txt)")

    args = parser.parse_args()
    extract_text_from_image(args.input, args.output)


if __name__ == "__main__":
    main()
