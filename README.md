# IndustrialMind — AI Knowledge Intelligence Platform

> ET AI Hackathon 2.0 — Problem Statement 8: AI for Industrial Knowledge Intelligence

## What It Does

IndustrialMind is an AI-powered platform that unifies fragmented industrial documents — maintenance procedures, incident reports, work orders, regulatory standards (OISD-116, Factory Act 1948), and compliance audits — into a queryable, actionable intelligence layer.

**Key Capabilities:**
- **AI Copilot** — RAG-powered conversational agent that answers operational, maintenance, and engineering queries with source citations
- **Knowledge Graph** — Interactive visualization of 28+ entities (equipment, work orders, incidents, permits, regulations, hazards) and their relationships
- **Compliance Intelligence** — Real-time compliance gap tracking against OISD-116, Factory Act 1948, OISD-105, and DGMS standards
- **Compound Risk Detection** — Identifies dangerous combinations that single-sensor/single-document views miss (e.g., active hot work permit + sub-threshold NH3 readings + zero critical spare stock)
- **Risk Scenario Analysis** — AI-powered "what if" scenario modeling against historical incidents and regulatory requirements

## Architecture

```
Frontend (Next.js 14 + TypeScript + Tailwind)
    ↕ REST API
Backend (FastAPI + Python)
    ├── RAG Engine (ChromaDB + Sentence Transformers)
    ├── Knowledge Graph (NetworkX — Equipment/WO/Incident/Permit/Regulation/Hazard nodes)
    ├── AI Agent (OpenAI GPT-4o / Groq Llama-3.3-70b)
    └── Document Store (5 realistic industrial documents)
```

## Demo Dataset

The platform ships with 5 realistic synthetic industrial documents for Visakhapatnam Fertilizer Complex:

1. **Maintenance Procedure P-101** — Centrifugal pump maintenance, safety precautions, OISD-116 compliance
2. **Incident Report IR-2024-047** — Near-miss investigation: NH3 accumulation + concurrent hot work (Aug 2024)
3. **OISD-116 Extract** — Hot work permit requirements, gas alarm thresholds, inspection intervals
4. **Work Order Log** — 5 open work orders across P-101, HE-301, V-101A, GD-303
5. **Compliance Audit Q3-2024** — 2 critical + 5 major non-conformances with regulatory mapping

## Quick Start

### Backend

```bash
cd backend

# Add your API key to .env
# Set MODEL_PROVIDER=groq and GROQ_API_KEY for free tier
# OR MODEL_PROVIDER=openai and OPENAI_API_KEY for GPT-4o

# Seed documents
python -m app.data.seed_documents

# Start server
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...          # Free alternative via groq.com
MODEL_PROVIDER=openai          # or "groq"
CHROMA_PERSIST_DIR=./chroma_db
DOCUMENTS_DIR=./app/data/documents
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

**Frontend → Vercel**
```bash
cd frontend
vercel --prod
# Set NEXT_PUBLIC_API_URL to your Railway backend URL
```

**Backend → Railway**
```bash
# Connect GitHub repo
# Set root directory: backend
# Start command: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
# Add environment variables in Railway dashboard
```

## Judging Criteria Alignment

| Criterion | How We Address It |
|-----------|-------------------|
| **Innovation (25%)** | Compound risk detection across multi-source data; knowledge graph connecting equipment → incidents → permits → regulations — not just a chatbot |
| **Business Impact (25%)** | Directly addresses the "data present, unacted upon" failure mode; demonstrated regulatory compliance coverage |
| **Technical Excellence (20%)** | RAG + Knowledge Graph + Agentic AI; entity-level extraction; source-cited answers with confidence scores |
| **Scalability (15%)** | ChromaDB scales to millions of docs; NetworkX graph exportable to Neo4j; stateless FastAPI backend |
| **User Experience (15%)** | Clean dark-mode UI; mobile-responsive copilot; one-click demo queries; no-login required |

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS v4, Framer Motion, React Markdown
- **Backend**: FastAPI, Python 3.14
- **AI/ML**: OpenAI GPT-4o, Sentence Transformers, LangChain
- **Vector DB**: ChromaDB
- **Graph**: NetworkX
- **Document Processing**: PyMuPDF, pypdf
