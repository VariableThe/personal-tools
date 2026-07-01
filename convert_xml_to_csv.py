#!/usr/bin/env python3
"""
Apple Music / iTunes Library XML to CSV Converter

Converts Apple Music or iTunes exported Library.xml files into clean, comprehensive CSV files:
1. Library_Tracks.csv: Complete track catalog with all metadata attributes.
2. Library_Playlists.csv: Playlists and their exact track order and details.
"""

import argparse
import csv
import plistlib
import sys
from pathlib import Path


def convert_library(xml_path: Path, output_dir: Path) -> None:
    if not xml_path.exists():
        print(f"Error: XML file not found at '{xml_path}'", file=sys.stderr)
        sys.exit(1)

    print(f"Loading '{xml_path}'...")
    try:
        with open(xml_path, "rb") as fp:
            plist_data = plistlib.load(fp)
    except Exception as e:
        print(f"Error reading plist XML file: {e}", file=sys.stderr)
        sys.exit(1)

    tracks = plist_data.get("Tracks", {})
    print(f"Found {len(tracks)} tracks.")

    output_dir.mkdir(parents=True, exist_ok=True)

    # Preferred column order for common metadata fields
    preferred_order = [
        "Track ID",
        "Name",
        "Artist",
        "Album Artist",
        "Composer",
        "Album",
        "Genre",
        "Kind",
        "Size",
        "Total Time",
        "Disc Number",
        "Disc Count",
        "Track Number",
        "Track Count",
        "Year",
        "Bit Rate",
        "Sample Rate",
        "Date Added",
        "Release Date",
        "Play Count",
        "Play Date UTC",
        "Rating",
        "Location",
        "Persistent ID",
        "Track Type",
        "Apple Music",
    ]

    all_keys = set()
    for track in tracks.values():
        all_keys.update(track.keys())

    remaining_keys = sorted(list(all_keys - set(preferred_order)))
    fieldnames = [k for k in preferred_order if k in all_keys] + remaining_keys

    tracks_csv_path = output_dir / "Library_Tracks.csv"
    print(f"Writing tracks to '{tracks_csv_path}'...")
    with open(tracks_csv_path, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=fieldnames)
        writer.writeheader()
        for track in tracks.values():
            row = {}
            for k in fieldnames:
                val = track.get(k, "")
                if isinstance(val, bytes):
                    val = val.hex()
                row[k] = val
            writer.writerow(row)

    # Export Playlists
    playlists = plist_data.get("Playlists", [])
    if playlists:
        playlists_csv_path = output_dir / "Library_Playlists.csv"
        print(f"Found {len(playlists)} playlists. Writing to '{playlists_csv_path}'...")
        with open(playlists_csv_path, "w", newline="", encoding="utf-8") as out_f:
            p_fieldnames = [
                "Playlist ID",
                "Playlist Name",
                "Playlist Description",
                "Track Order",
                "Track ID",
                "Track Name",
                "Track Artist",
                "Track Album",
            ]
            writer = csv.DictWriter(out_f, fieldnames=p_fieldnames)
            writer.writeheader()
            for pl in playlists:
                pl_id = pl.get("Playlist ID", "")
                pl_name = pl.get("Name", "")
                pl_desc = pl.get("Description", "")
                items = pl.get("Playlist Items", [])
                if not items:
                    writer.writerow(
                        {
                            "Playlist ID": pl_id,
                            "Playlist Name": pl_name,
                            "Playlist Description": pl_desc,
                            "Track Order": "",
                            "Track ID": "",
                            "Track Name": "",
                            "Track Artist": "",
                            "Track Album": "",
                        }
                    )
                else:
                    for idx, item in enumerate(items, 1):
                        t_id = str(item.get("Track ID", ""))
                        t_info = (
                            tracks.get(t_id, tracks.get(int(t_id), {}))
                            if t_id.isdigit()
                            else {}
                        )
                        writer.writerow(
                            {
                                "Playlist ID": pl_id,
                                "Playlist Name": pl_name,
                                "Playlist Description": pl_desc,
                                "Track Order": idx,
                                "Track ID": t_id,
                                "Track Name": t_info.get("Name", ""),
                                "Track Artist": t_info.get("Artist", ""),
                                "Track Album": t_info.get("Album", ""),
                            }
                        )

    print("Conversion completed successfully!")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Apple Music / iTunes Library.xml to CSV files."
    )
    parser.add_argument(
        "input",
        type=Path,
        nargs="?",
        default=Path("Library.xml"),
        help="Path to the Apple Music/iTunes Library.xml file (default: ./Library.xml)",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=None,
        help="Directory to save output CSV files (default: same directory as input XML)",
    )

    args = parser.parse_args()
    output_dir = args.output_dir if args.output_dir else args.input.parent

    convert_library(args.input, output_dir)


if __name__ == "__main__":
    main()
