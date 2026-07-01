# Apple Music & iTunes Library XML to CSV Converter

A lightning-fast, zero-dependency Python tool to convert Apple Music or iTunes `Library.xml` exports into comprehensive, clean CSV spreadsheets.

## ✨ Features

- **Zero Dependencies**: Uses only Python 3 built-in libraries (`plistlib`, `csv`, `argparse`, `pathlib`).
- **Complete Track Export**: Extracts all available song attributes (Track ID, Name, Artist, Album, Genre, Bit Rate, Sample Rate, Play Count, Release Date, Location, etc.) and saves them to `Library_Tracks.csv`.
- **Playlist Preservation**: Exports all playlists along with track ordering and item details to `Library_Playlists.csv`.
- **Intelligent Column Sorting**: Places common metadata columns first while preserving all extra custom properties found across your library.

## 🚀 Usage

### 1. Export your Library from Apple Music / iTunes
1. Open **Apple Music** (macOS) or **iTunes** (Windows).
2. Go to `File` > `Library` > `Export Library...`.
3. Save the file as `Library.xml`.

### 2. Run the Converter
Run the script directly from your terminal:

```bash
python3 convert_xml_to_csv.py path/to/Library.xml
```

You can optionally specify an output directory using the `-o` flag:

```bash
python3 convert_xml_to_csv.py Library.xml -o ./output_csvs/
```

## 📊 Output Files

When finished, the converter generates two CSV files in your target folder:

1. **`Library_Tracks.csv`**: Contains every track in your library.
2. **`Library_Playlists.csv`**: Contains every playlist, ordered by track sequence.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///Users/aditya/downloads/apple-music-xml-to-csv/LICENSE) file for details.
