#!/usr/bin/env python3
"""
PDF to PNG Converter (Command Line Tool)

Renders PDF pages into high-resolution PNG image files.
Requires: pypdfium2 (pip install pypdfium2) or pdf2image
"""

import argparse
import sys
from pathlib import Path

try:
    import pypdfium2 as pdfium
except ImportError:
    print("Error: pypdfium2 library not found. Please run: pip install pypdfium2", file=sys.stderr)
    sys.exit(1)


def convert_pdf_to_png(pdf_path: Path, output_dir: Path, dpi: int = 300) -> None:
    if not pdf_path.exists():
        print(f"Error: PDF file not found at '{pdf_path}'", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    scale = dpi / 72.0

    print(f"Loading '{pdf_path}'...")
    pdf = pdfium.PdfDocument(pdf_path)
    total_pages = len(pdf)
    print(f"Rendering {total_pages} pages at ~{dpi} DPI...")

    for i, page in enumerate(pdf):
        image = page.render(scale=scale).to_pil()
        out_file = output_dir / f"{pdf_path.stem}_page_{i + 1:03d}.png"
        image.save(out_file, "PNG")
        print(f"  Saved page {i + 1}/{total_pages} -> {out_file}")

    print("PDF to PNG conversion completed successfully!")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert PDF document pages to PNG images.")
    parser.add_argument("input", type=Path, help="Path to input PDF file")
    parser.add_argument("-o", "--output-dir", type=Path, default=None, help="Directory to save output images")
    parser.add_argument("--dpi", type=int, default=300, help="Resolution in DPI (default: 300)")

    args = parser.parse_args()
    out_dir = args.output_dir if args.output_dir else args.input.parent / f"{args.input.stem}_images"
    convert_pdf_to_png(args.input, out_dir, args.dpi)


if __name__ == "__main__":
    main()
