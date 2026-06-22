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
    """Upload a new document and ingest it."""
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
    return {"status": "uploaded", "filename": file.filename, "ingestion": result}


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
