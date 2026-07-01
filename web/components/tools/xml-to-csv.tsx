"use client";

import React, { useState } from "react";
import { Upload, FileText, Download, Check, AlertCircle } from "lucide-react";

export function XmlToCsvTool() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("converted.csv");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    setLoading(true);
    setError(null);
    setCsvContent(null);
    setFileName(uploaded.name.replace(/\.xml$|\.plist$/i, "") + ".csv");

    try {
      const text = await uploaded.text();
      parseAndConvertXml(text);
    } catch (err: any) {
      setError("Failed to read file: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const parseAndConvertXml = (xmlString: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, "application/xml");

      // Check for XML parsing error
      const errNode = doc.querySelector("parsererror");
      if (errNode) {
        throw new Error("Invalid XML file format.");
      }

      // Check if it's an Apple Plist
      if (doc.querySelector("plist") || xmlString.includes("DOCTYPE plist")) {
        convertPlistToCsv(doc);
      } else {
        convertStandardXmlToCsv(doc);
      }
    } catch (err: any) {
      setError(err.message || "Could not parse XML structure.");
    }
  };

  const convertPlistToCsv = (doc: Document) => {
    // Look for <key>Tracks</key> or main array/dict
    const keys = doc.querySelectorAll("key");
    let tracksDictNode: Element | null = null;

    keys.forEach((k) => {
      if (k.textContent === "Tracks" && k.nextElementSibling?.tagName === "dict") {
        tracksDictNode = k.nextElementSibling;
      }
    });

    const records: Record<string, string>[] = [];

    if (tracksDictNode) {
      // Each entry inside Tracks dict is <key>id</key><dict>...track details...</dict>
      const childDicts = (tracksDictNode as Element).querySelectorAll(":scope > dict");
      childDicts.forEach((dictNode) => {
        records.push(parsePlistDict(dictNode));
      });
    } else {
      // Fallback: parse all top-level dicts inside plist
      const allDicts = doc.querySelectorAll("plist > dict, plist > array > dict");
      allDicts.forEach((dictNode) => {
        records.push(parsePlistDict(dictNode));
      });
    }

    if (records.length === 0) {
      throw new Error("No structured dictionary records found in plist XML.");
    }

    generateCsv(records);
  };

  const parsePlistDict = (dictNode: Element): Record<string, string> => {
    const row: Record<string, string> = {};
    const children = Array.from(dictNode.children);
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.tagName === "key") {
        const keyName = el.textContent || `Col_${i}`;
        const valNode = children[i + 1];
        if (valNode) {
          if (valNode.tagName === "true") row[keyName] = "true";
          else if (valNode.tagName === "false") row[keyName] = "false";
          else row[keyName] = valNode.textContent || "";
          i++; // skip value node
        }
      }
    }
    return row;
  };

  const convertStandardXmlToCsv = (doc: Document) => {
    const root = doc.documentElement;
    const children = Array.from(root.children);

    if (children.length === 0) {
      throw new Error("XML root contains no child records.");
    }

    // Find repeating child tags
    const records: Record<string, string>[] = [];
    children.forEach((child) => {
      const row: Record<string, string> = {};
      // Get attributes
      Array.from(child.attributes).forEach((attr) => {
        row[attr.name] = attr.value;
      });
      // Get subelements
      Array.from(child.children).forEach((sub) => {
        if (sub.children.length === 0) {
          row[sub.tagName] = sub.textContent?.trim() || "";
        }
      });
      if (Object.keys(row).length === 0 && child.textContent) {
        row["Value"] = child.textContent.trim();
      }
      records.push(row);
    });

    generateCsv(records);
  };

  const generateCsv = (records: Record<string, string>[]) => {
    const allKeysSet = new Set<string>();
    records.forEach((r) => Object.keys(r).forEach((k) => allKeysSet.add(k)));
    const allCols = Array.from(allKeysSet).sort();

    setColumns(allCols);
    setPreviewRows(records.slice(0, 10));

    // Build CSV String
    const header = allCols.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
    const rows = records.map((r) =>
      allCols.map((c) => `"${(r[c] || "").replace(/"/g, '""')}"`).join(",")
    );

    setCsvContent([header, ...rows].join("\n"));
  };

  const downloadCsv = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-900/40 text-center">
        <input
          type="file"
          accept=".xml,.plist"
          id="xml-upload"
          className="hidden"
          onChange={handleFileUpload}
        />
        <label
          htmlFor="xml-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {file ? file.name : "Select or Drag & Drop an XML / Plist File"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Supports Apple Music Library exports (`Library.xml`), RSS feeds, or standard XML catalogs.
            </p>
          </div>
          <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
            Browse XML File
          </span>
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {csvContent && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="font-medium text-zinc-200">Converted Successfully!</h4>
                <p className="text-xs text-zinc-400">
                  Found {columns.length} columns and ready for local download.
                </p>
              </div>
            </div>
            <button
              onClick={downloadCsv}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download CSV ({fileName})
            </button>
          </div>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
            <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between items-center">
              <span>Data Preview (First 10 Rows)</span>
              <span>Total Columns: {columns.length}</span>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/40 text-zinc-400 sticky top-0">
                  <tr>
                    {columns.slice(0, 8).map((col) => (
                      <th key={col} className="p-3 font-medium whitespace-nowrap border-b border-zinc-800">
                        {col}
                      </th>
                    ))}
                    {columns.length > 8 && (
                      <th className="p-3 font-medium text-zinc-500 border-b border-zinc-800">
                        + {columns.length - 8} more columns...
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                      {columns.slice(0, 8).map((col) => (
                        <td key={col} className="p-3 max-w-xs truncate whitespace-nowrap">
                          {row[col] || "-"}
                        </td>
                      ))}
                      {columns.length > 8 && (
                        <td className="p-3 text-zinc-500 italic">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
