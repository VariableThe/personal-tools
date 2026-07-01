# Personal Utility Hub & On-Device Web Tools Suite (iLovePDF & iLoveIMG Suite)

A comprehensive suite of utilities for PDF editing, image manipulation, optical character recognition (OCR), color extraction, and data conversion. All tools are accessible via an interactive, vibrant **100% On-Device Next.js Web Application** and supported by **command-line Python scripts**.

---

## 🛡️ Privacy Guarantee: 100% On-Device Execution

When using the web interface (`web/`), **all operations are executed entirely on your device inside your browser sandbox.** 
- PDF editing & merging uses `pdf-lib` and local canvas rendering (`pdfjs-dist`).
- OCR uses WebAssembly Web Workers (`tesseract.js`).
- Image masking, resizing, cropping, and redaction execute on local HTML5 Canvas.
- **No files or data ever leave your device or get sent to any cloud server.**

---

## 🧰 Available Tools Suite (15 Utilities)

### 📂 PDF Suite (iLovePDF Equivalent)
| Tool Name | Web Interface | Description |
| :--- | :--- | :--- |
| **Merge PDF** | Built-in | Combine multiple PDF files into a single unified document with custom drag-and-drop page ordering. |
| **Split PDF** | Built-in | Extract specific page ranges (e.g. `1-3, 5`) or single pages into a fresh PDF file. |
| **Rotate PDF** | Built-in | Rotate entire PDF documents by 90°, 180°, or 270° instantly. |
| **Watermark PDF** | Built-in | Stamp custom text watermarks across all document pages with adjustable opacity, angle, and RGB color. |
| **Page Numbers** | Built-in | Add clean page numbering (`Page X of Y`) to headers or footers across your PDF files. |
| **JPG / PNG to PDF** | Built-in | Convert multiple JPG, PNG, or WEBP photos into a structured PDF album. |
| **PDF to PNG Renderer** | Built-in | Render PDF pages into high-resolution PNG image files or download all pages as a ZIP archive. |

### 🖼️ Image Suite (iLoveIMG Equivalent)
| Tool Name | Web Interface | Description |
| :--- | :--- | :--- |
| **Compress & Resize Image** | Built-in | Adjust exact pixel width/height, modify compression quality %, and convert between WEBP, PNG, and JPG. |
| **Crop Image** | Built-in | Trim image edges with preset aspect ratios (`1:1 Square`, `16:9 Landscape`, `4:3 Standard`) or custom percentage sliders. |
| **Watermark Photo** | Built-in | Overlay custom copyright branding or text watermarks onto photos before publishing. |
| **Redact & Blur Info** | Built-in | Interactive canvas where you can click and drag rectangles over sensitive data (faces, IDs, passwords) to pixelate them. |
| **Image to Text (OCR)** | Built-in | Extract editable optical character text from screenshots or document scans using Tesseract WASM. |
| **Color Extractor & Masker** | Built-in | Eyedropper tool to pick exact RGB colors from canvas and generate transparent cutouts based on tolerance. |

### 📊 Data & Code Utilities
| Tool Name | CLI Script | Web Interface | Description |
| :--- | :--- | :--- | :--- |
| **XML / Plist to CSV Converter** | `convert_xml_to_csv.py` | Built-in | Converts Apple Music `Library.xml` exports, RSS feeds, or standard XML files into clean CSV tables. |

---

## 🌐 Launching the Web Interface Locally

The interactive website is built with Next.js 16 (Turbopack) & Shadcn UI in the `web/` directory.

```bash
cd web
npm install # or bun install
npm run dev # or bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to explore and use all 15 utilities locally.

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
