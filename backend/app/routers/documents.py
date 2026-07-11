from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import os
import aiofiles
from app.services import rag_engine
from app.config import get_settings

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


@router.post("/ingest")
async def ingest_documents():
    """Trigger ingestion of all documents in the documents directory."""
    try:
        result = rag_engine.ingest_documents()
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a new document, ingest it, and extract entities."""
    allowed_types = {"text/plain", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .pdf files are supported"
        )

    docs_dir = settings.documents_dir
    os.makedirs(docs_dir, exist_ok=True)
    filepath = os.path.join(docs_dir, file.filename or "uploaded_doc.txt")

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Re-ingest
    result = rag_engine.ingest_documents()

    # Extract entities
    from app.services.entity_extractor import extract_from_file
    entities = extract_from_file(filepath)

    return {
        "status": "uploaded",
        "filename": file.filename,
        "ingestion": result,
        "entities_extracted": entities,
    }


@router.get("/status")
async def ingestion_status():
    """Get the current ingestion status."""
    return rag_engine.get_ingestion_status()


@router.get("/list")
async def list_documents():
    """List all ingested documents."""
    docs_dir = settings.documents_dir
    if not os.path.exists(docs_dir):
        return {"documents": []}

    docs = []
    for fname in os.listdir(docs_dir):
        if fname.endswith((".txt", ".pdf")):
            fpath = os.path.join(docs_dir, fname)
            docs.append({
                "filename": fname,
                "size_kb": round(os.path.getsize(fpath) / 1024, 1),
            })
    return {"documents": docs, "total": len(docs)}


@router.post("/extract-entities")
async def extract_entities_from_text(payload: dict):
    """Extract industrial entities from provided text."""
    text = payload.get("text", "")
    doc_type = payload.get("doc_type")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    from app.services.entity_extractor import extract_entities, entities_to_dict
    entities = extract_entities(text, doc_type)
    return entities_to_dict(entities)


@router.get("/corpus-entities")
async def get_corpus_entities():
    """Extract and aggregate entities across all ingested documents."""
    from app.services.entity_extractor import extract_from_file
    import json

    docs_dir = settings.documents_dir
    if not os.path.exists(docs_dir):
        return {"documents": [], "aggregate": {}}

    metadata_path = os.path.join(docs_dir, "metadata.json")
    metadata_index: dict = {}
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            for item in json.load(f):
                metadata_index[item["filename"]] = item

    all_equipment: set = set()
    all_wos: set = set()
    all_incidents: set = set()
    all_regs: set = set()
    all_chemicals: set = set()
    documents_analyzed = []

    for fname in os.listdir(docs_dir):
        if not fname.endswith((".txt", ".pdf")) or fname == "metadata.json":
            continue
        fpath = os.path.join(docs_dir, fname)
        doc_type = metadata_index.get(fname, {}).get("doc_type", "Unknown")
        result = extract_from_file(fpath, doc_type)
        if "error" not in result:
            documents_analyzed.append({
                "filename": fname,
                "doc_type": doc_type,
                "entities": result,
            })
            all_equipment.update(result.get("equipment_tags", []))
            all_wos.update(result.get("work_orders", []))
            all_incidents.update(result.get("incident_ids", []))
            all_regs.update(result.get("regulations", []))
            all_chemicals.update(result.get("chemicals", []))

    return {
        "documents_analyzed": len(documents_analyzed),
        "documents": documents_analyzed,
        "aggregate": {
            "equipment_tags": sorted(all_equipment),
            "work_orders": sorted(all_wos),
            "incident_ids": sorted(all_incidents),
            "regulations": sorted(all_regs),
            "chemicals": sorted(all_chemicals),
            "total_unique_entities": len(all_equipment) + len(all_wos) + len(all_incidents) + len(all_regs),
        }
    }
