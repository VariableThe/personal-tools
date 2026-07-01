# Personal Utility Hub & On-Device Web Tools

A comprehensive suite of utilities for data conversion, image manipulation, optical character recognition (OCR), and PDF extraction. All tools are available as **command-line Python scripts** and accessible via an interactive **100% On-Device Next.js Web Application**.

---

## 🛡️ Privacy Guarantee: 100% On-Device Execution

When using the web interface (`web/`), **all operations are executed entirely on your device inside your browser sandbox.** 
- PDF rendering uses local canvas graphics (`pdfjs-dist`).
- OCR uses WebAssembly Web Workers (`tesseract.js`).
- Image masking and resizing execute on local HTML5 Canvas.
- **No files or data ever leave your device or get sent to any server.**

---

## 🧰 Available Tools Suite

| Tool Name | CLI Script | Web Interface | Description |
| :--- | :--- | :--- | :--- |
| **XML to CSV Converter** | `convert_xml_to_csv.py` | Built-in | Converts structured XML feeds or Apple Property List (`plist`) XML exports into clean CSV tables. |
| **Color Extractor & Masker** | `extract_color.py` | Built-in | Interactive eyedropper & slider utility to isolate exact RGB colors and export transparent RGBA cutouts. |
| **PDF to PNG Renderer** | `pdf_to_png.py` | Built-in | Renders multi-page PDF documents into high-resolution PNG files or bulk ZIP packages. |
| **Image to Text (OCR)** | `image_to_text.py` | Built-in | Recognizes optical character text from screenshots or scanned image documents. |
| **Image Resizer & Converter** | N/A | Built-in | Adjusts pixel dimensions, modifies compression quality, and converts between WEBP, PNG, and JPG. |

---

## 🌐 Launching the Web Interface

The interactive website is built with Next.js & Shadcn UI in the `web/` directory.

```bash
cd web
bun install
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the interactive suite.

---

## 💻 Command-Line (CLI) Usage

Make sure you have Python 3 installed along with dependencies:
```bash
pip install -r requirements.txt
```

### 1. XML to CSV Converter
```bash
python3 convert_xml_to_csv.py path/to/input.xml -o ./output_folder/
```

### 2. Image Color Extractor (Desktop GUI)
```bash
python3 extract_color.py
```

### 3. PDF to PNG Converter
```bash
python3 pdf_to_png.py path/to/document.pdf --dpi 300
```

### 4. Image to Text OCR
```bash
python3 image_to_text.py path/to/scan.png -o output.txt
```

---

## 📄 License

MIT License.
