"""
RAG Engine — Document ingestion, vector store, and retrieval.
Uses ChromaDB (0.5.x) for vector storage with default embedding function.
"""
import os
import json
from pathlib import Path
from typing import Optional

import chromadb

from app.config import get_settings

settings = get_settings()

COLLECTION_NAME = "industrialmind_docs"
_chroma_client: Optional[chromadb.PersistentClient] = None
_collection = None


def _get_client():
    global _chroma_client
    if _chroma_client is None:
        persist_dir = settings.chroma_persist_dir
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
    return _chroma_client


def _get_collection():
    global _collection
    if _collection is None:
        client = _get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def ingest_documents(documents_dir: Optional[str] = None) -> dict:
    docs_dir = documents_dir or settings.documents_dir
    collection = _get_collection()

    ingested = []
    skipped = []
    errors = []

    metadata_path = os.path.join(docs_dir, "metadata.json")
    metadata_index: dict = {}
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            for item in json.load(f):
                metadata_index[item["filename"]] = item

    for filepath in Path(docs_dir).glob("*"):
        if filepath.suffix.lower() not in {".txt", ".pdf"}:
            continue
        if filepath.name == "metadata.json":
            continue

        try:
            text = _read_file(filepath)
            if not text.strip():
                skipped.append(filepath.name)
                continue
            # Extract entities from full document text to enrich metadata
            try:
                from app.services import entity_extractor
                doc_entities = entity_extractor.extract_entities(text, file_meta.get("doc_type", None))
                doc_entities = entity_extractor.entities_to_dict(doc_entities)
            except Exception:
                doc_entities = {}

            chunks = _chunk_text(text, chunk_size=800, overlap=100)
            file_meta = metadata_index.get(filepath.name, {})

            ids, documents, metadatas = [], [], []
            for i, chunk in enumerate(chunks):
                ids.append(f"{filepath.stem}_chunk_{i}")
                documents.append(chunk)
                metadatas.append({
                    "filename": filepath.name,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "doc_type": file_meta.get("doc_type", "Unknown"),
                    "asset_tag": file_meta.get("asset_tag", ""),
                    "plant": file_meta.get("plant", ""),
                    "criticality": file_meta.get("criticality", ""),
                    "extracted_entities": doc_entities,
                })

            collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
            ingested.append(filepath.name)

        except Exception as e:
            errors.append({"file": filepath.name, "error": str(e)})

    return {
        "ingested": ingested,
        "skipped": skipped,
        "errors": errors,
        "total_chunks": collection.count(),
    }


def _read_file(filepath: Path) -> str:
    # Delegate robust reading (pdf text extraction + OCR fallback) to document_processor
    try:
        from app.services import document_processor
        return document_processor.read_text(str(filepath))
    except Exception:
        # Fallback: attempt pypdf then plain text
        if filepath.suffix.lower() == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(str(filepath))
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception:
                return ""
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


def retrieve(query: str, n_results: int = 6, filter_doc_type: Optional[str] = None) -> list[dict]:
    collection = _get_collection()
    if collection.count() == 0:
        return []

    kwargs: dict = {
        "query_texts": [query],
        "n_results": min(n_results, collection.count()),
        "include": ["documents", "metadatas", "distances"],
    }
    if filter_doc_type:
        kwargs["where"] = {"doc_type": {"$eq": filter_doc_type}}

    try:
        results = collection.query(**kwargs)
    except Exception:
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

    chunks = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "content": doc,
                "metadata": meta,
                "relevance_score": round(1 - float(dist), 3),
            })
    return chunks


def get_ingestion_status() -> dict:
    collection = _get_collection()
    return {
        "collection": COLLECTION_NAME,
        "total_chunks": collection.count(),
        "ready": collection.count() > 0,
    }
