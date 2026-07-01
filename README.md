# Personal Python Tools

A collection of utility tools built for everyday automation, image processing, and data conversion.

---

## 🧰 Available Tools

| Tool | Script | Description |
| :--- | :--- | :--- |
| **XML to CSV Converter** | `convert_xml_to_csv.py` | Converts structured XML files or Property List (`plist`) XML files into clean tabular CSV spreadsheets. |
| **Image Color Extractor** | `extract_color.py` | Interactive GUI tool to select an image, pick a color, adjust tolerance, and export transparent RGBA cutouts. |

---

## 🚀 Setup & Installation

Ensure you have Python 3 installed. For GUI image tools (`extract_color.py`), install the required libraries:

```bash
pip install -r requirements.txt
```

---

## 📖 Tool Usage & Documentation

### 1. XML to CSV Converter (`convert_xml_to_csv.py`)
Parses XML structures (such as data catalogs, exported feeds, or plist structures) and flattens them into `.csv` files.

**How to run:**
```bash
python3 convert_xml_to_csv.py path/to/input.xml -o ./output_folder/
```
- **Arguments:**
  - `input`: Path to your `.xml` file.
  - `-o, --output-dir` *(optional)*: Directory to output generated `.csv` files.

---

### 2. Image Color Extractor (`extract_color.py`)
Provides an interactive GUI interface (`tkinter`) to isolate specific color ranges from an image and mask the rest to transparent.

**How to run:**
```bash
python3 extract_color.py
```
- **Workflow Steps:**
  1. **Select Image**: Choose an image file (`PNG`, `JPG`, `WEBP`, etc.) from the popup dialog.
  2. **Pick Color**: Use the visual color chooser to pick the exact RGB color you want to keep.
  3. **Set Tolerance**: Enter a numeric distance (0–255) to specify how closely colors must match your selection (default: `30`).
  4. **Save Cutout**: Choose where to save your transparent `.png` mask.

---

## 📄 License

MIT License.
