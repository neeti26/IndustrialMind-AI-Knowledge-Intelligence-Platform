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
