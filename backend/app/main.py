from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import documents, query, graph, intelligence
from app.services import rag_engine
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        status = rag_engine.get_ingestion_status()
        if not status["ready"]:
            docs_dir = settings.documents_dir
            if os.path.exists(docs_dir) and os.listdir(docs_dir):
                print("[IndustrialMind] Auto-ingesting documents...")
                result = rag_engine.ingest_documents()
                print(f"[IndustrialMind] Ingested {len(result['ingested'])} files, {result['total_chunks']} chunks")
            else:
                print(f"[IndustrialMind] Documents dir empty or missing: {docs_dir}")
        else:
            print(f"[IndustrialMind] Vector store ready: {status['total_chunks']} chunks")
    except Exception as e:
        print(f"[IndustrialMind] Startup warning: {e}")
    yield


app = FastAPI(
    title="IndustrialMind API",
    description="AI-Powered Industrial Knowledge Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple API key auth + audit logging middleware
@app.middleware("http")
async def auth_and_audit(request, call_next):
    from time import time
    from datetime import datetime
    from app.config import get_settings
    settings = get_settings()

    # allow public health and root
    public_paths = {"/", "/health", "/docs", "/openapi.json"}
    path = request.url.path
    if any(path.startswith(p) for p in public_paths):
        resp = await call_next(request)
        return resp

    if settings.enable_auth:
        key = request.headers.get("X-API-KEY") or request.query_params.get("api_key")
        if not key or key != settings.api_key:
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "Unauthorized"}, status_code=401)

    start = time()
    response = await call_next(request)
    elapsed = time() - start

    # Audit log
    try:
        log_path = settings.audit_log_path
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as f:
            ak = (request.headers.get("X-API-KEY") or "-")
            ak_mask = ak[:4] + "..." if ak and len(ak) > 6 else ak
            entry = f"{datetime.utcnow().isoformat()}Z\t{request.client.host if request.client else '-'}\t{request.method}\t{path}\t{response.status_code}\t{elapsed:.3f}s\t{ak_mask}\n"
            f.write(entry)
    except Exception:
        pass

    return response

app.include_router(documents.router)
app.include_router(query.router)
app.include_router(graph.router)
app.include_router(intelligence.router)


@app.get("/")
async def root():
    return {
        "app": "IndustrialMind",
        "version": "1.0.0",
        "status": "running",
        "description": "AI Knowledge Intelligence Platform for Industrial Operations",
    }


@app.get("/health")
async def health():
    from app.services.knowledge_graph import get_graph_stats
    try:
        rag_status = rag_engine.get_ingestion_status()
    except Exception as e:
        rag_status = {"error": str(e), "ready": False}
    try:
        graph_stats = get_graph_stats()
    except Exception as e:
        graph_stats = {"error": str(e)}
    return {
        "status": "healthy",
        "rag": rag_status,
        "graph": graph_stats,
    }
