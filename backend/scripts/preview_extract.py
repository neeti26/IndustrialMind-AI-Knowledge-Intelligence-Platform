"""Run a local preview of extraction for all documents in the seeded corpus.

Usage:
    python backend/scripts/preview_extract.py

This prints a JSON array of {filename, entities} to stdout.
"""
import json
import os
from app.config import get_settings

settings = get_settings()
docs_dir = settings.documents_dir

from app.services import document_processor, entity_extractor

def main():
    if not os.path.exists(docs_dir):
        print(json.dumps({"error": "documents_dir_missing", "path": docs_dir}))
        return

    out = []
    for fname in os.listdir(docs_dir):
        if not fname.endswith((".txt", ".pdf")) or fname == "metadata.json":
            continue
        fpath = os.path.join(docs_dir, fname)
        text = document_processor.read_text(fpath)
        entities = document_processor.extract_entities_from_text(text, entity_extractor, source=fname)
        out.append({"filename": fname, "entities": entities})

    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
