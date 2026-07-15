"""
Document Processor

Provides robust text extraction for documents. Uses pypdf text extraction first
and falls back to OCR via pytesseract + pdf2image if available.

This module is intentionally dependency-light at runtime: OCR-related
packages are optional and the code handles their absence gracefully.
"""
from pathlib import Path
from typing import Optional
import os


def _read_pdf_with_pypdf(path: str) -> str:
    try:
        import pypdf
        reader = pypdf.PdfReader(path)
        pages = []
        for p in reader.pages:
            pages.append(p.extract_text() or "")
        return "\n".join(pages)
    except Exception:
        return ""


def read_pdf_pages(path: str) -> list[str] | None:
    """Return a list of page texts for a PDF, or None on failure."""
    try:
        import pypdf
        reader = pypdf.PdfReader(path)
        pages = []
        for i, p in enumerate(reader.pages):
            pages.append(p.extract_text() or "")
        return pages
    except Exception:
        return None


def _ocr_pdf(path: str) -> str:
    """Attempt OCR using pdf2image + pytesseract. Return empty string on failure."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from PIL import Image
    except Exception:
        return ""

    text_parts = []
    try:
        # Let pdf2image run with default settings. If poppler not available, this will fail.
        images = convert_from_path(path, dpi=200)
        for img in images:
            t = pytesseract.image_to_string(img)
            if t:
                text_parts.append(t)
    except Exception:
        return ""

    return "\n".join(text_parts)


def _read_text_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""


def read_text(path: str) -> str:
    """Read a document and return extracted text.

    Strategy:
    - If file is .txt or .md -> read directly
    - If file is .pdf -> try pypdf text extraction, fall back to OCR if empty
    - For other types, attempt plain-text read
    """
    p = Path(path)
    if not p.exists():
        return ""

    suffix = p.suffix.lower()
    if suffix in {".txt", ".md", ".csv"}:
        return _read_text_file(path)

    if suffix == ".pdf":
        text = _read_pdf_with_pypdf(path)
        if text and text.strip():
            return text
        # fallback to OCR
        ocr_text = _ocr_pdf(path)
        return ocr_text

    # Unknown binary: try text read
    return _read_text_file(path)


def extract_entities_from_text(text: str, extractor, source: str = "inline") -> dict:
    """Extract entities and attach lightweight provenance and confidence.

    The extractor in this repo (`entity_extractor`) uses regex/domain rules and
    returns a dataclass. We convert that to a dict and add a `provenance` field
    with `source` and a heuristic confidence for each entity list.
    """
    try:
        ent = extractor.extract_entities(text)
        entities = extractor.entities_to_dict(ent) if hasattr(extractor, "entities_to_dict") else {k: getattr(ent, k) for k in ent.__dataclass_fields__.keys()}
        # Attach provenance and default confidences
        provenance = {"source": source, "method": "regex_rules", "confidence_hint": 0.85}
        # Per-entity confidences (heuristic): shorter lists => higher confidence
        total = max(1, entities.get("total_entities", 1))
        conf = round(min(0.95, 0.5 + 0.5 * (1 / (total ** 0.5))), 2)
        enriched = {**entities, "provenance": provenance, "entity_confidence": conf}
        return enriched
    except Exception:
        return {"error": "extraction_failed", "provenance": {"source": source}}
