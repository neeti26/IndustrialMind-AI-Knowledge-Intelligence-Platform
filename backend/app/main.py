from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import documents, query, graph
from app.services import rag_engine
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-seed documents on startup if dir exists and collection is empty
    status = rag_engine.get_ingestion_status()
    if not status["ready"]:
        docs_dir = settings.documents_dir
        if os.path.exists(docs_dir):
            print("[IndustrialMind] Auto-ingesting documents on startup...")
            result = rag_engine.ingest_documents()
            print(f"[IndustrialMind] Ingested: {result['ingested']}, chunks: {result['total_chunks']}")
        else:
            print(f"[IndustrialMind] Documents dir not found: {docs_dir}")
            print("[IndustrialMind] Run: python -m app.data.seed_documents to create sample docs")
    else:
        print(f"[IndustrialMind] Vector store ready. {status['total_chunks']} chunks loaded.")
    yield


app = FastAPI(
    title="IndustrialMind API",
    description="AI-Powered Industrial Knowledge Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)
app.include_router(graph.router)


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
    rag_status = rag_engine.get_ingestion_status()
    graph_stats = get_graph_stats()
    return {
        "status": "healthy",
        "rag": rag_status,
        "graph": graph_stats,
    }
