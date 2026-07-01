#!/usr/bin/env python3
"""
General XML to CSV Converter

Converts structured XML files (including standard XML data feeds, catalogs, or Property List XML files)
into clean, tabular CSV files automatically.
"""

import argparse
import csv
import plistlib
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def convert_plist_xml(xml_path: Path, output_dir: Path) -> bool:
    """Try converting as an Apple/generic plist XML file containing dicts/lists of records."""
    try:
        with open(xml_path, "rb") as fp:
            data = plistlib.load(fp)
    except Exception:
        return False

    converted = False
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, dict) and all(isinstance(v, dict) for v in value.values()):
                # e.g., Tracks dictionary
                records = list(value.values())
                export_records_to_csv(records, output_dir / f"{key}.csv")
                converted = True
            elif isinstance(value, list) and all(isinstance(v, dict) for v in value):
                export_records_to_csv(value, output_dir / f"{key}.csv")
                converted = True
    elif isinstance(data, list) and all(isinstance(v, dict) for v in data):
        export_records_to_csv(data, output_dir / f"{xml_path.stem}.csv")
        converted = True

    return converted


def convert_standard_xml(xml_path: Path, output_dir: Path) -> None:
    """Convert standard XML tree structure into CSV rows based on child elements."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Find repeating child elements to treat as table rows
    children = list(root)
    if not children:
        print("XML file contains no child elements to export.")
        return

    # Group children by tag
    tag_groups = {}
    for child in children:
        tag_groups.setdefault(child.tag, []).append(child)

    for tag, elements in tag_groups.items():
        records = []
        for el in elements:
            row = dict(el.attrib)
            for sub in el:
                if len(sub) == 0:  # Leaf node
                    row[sub.tag] = sub.text.strip() if sub.text else ""
            records.append(row)

        if records:
            out_file = output_dir / f"{xml_path.stem}_{tag}.csv" if len(tag_groups) > 1 else output_dir / f"{xml_path.stem}.csv"
            export_records_to_csv(records, out_file)


def export_records_to_csv(records: list, out_file: Path) -> None:
    if not records:
        return

    all_keys = set()
    for r in records:
        all_keys.update(r.keys())

    fieldnames = sorted(list(all_keys))
    out_file.parent.mkdir(parents=True, exist_ok=True)

    print(f"Exporting {len(records)} rows -> {out_file}...")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            row = {}
            for k in fieldnames:
                val = r.get(k, "")
                if isinstance(val, bytes):
                    val = val.hex()
                row[k] = val
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert structured XML files to CSV format.")
    parser.add_argument("input", type=Path, help="Path to the XML file to convert")
    parser.add_argument("-o", "--output-dir", type=Path, default=None, help="Directory to save output CSV files")

    args = parser.parse_args()
    if not args.input.exists():
        print(f"Error: Input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(1)

    output_dir = args.output_dir if args.output_dir else args.input.parent

    # Try plist format first, fallback to standard ElementTree XML parsing
    if not convert_plist_xml(args.input, output_dir):
        convert_standard_xml(args.input, output_dir)
    print("Conversion completed!")


if __name__ == "__main__":
    main()
