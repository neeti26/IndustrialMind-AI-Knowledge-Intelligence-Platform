# IndustrialMind — AI Knowledge Intelligence Platform

IndustrialMind is an industrial operations intelligence platform designed to turn fragmented plant knowledge into actionable decision support. It connects maintenance procedures, incident reports, work orders, compliance findings, and regulatory standards into a single reasoning layer that can answer operational questions, surface regulatory exposure, and highlight compound safety risks.

This repository is not a toy chatbot demo. It contains a working prototype with a FastAPI backend, a Next.js frontend, vector-based document retrieval, a knowledge graph, and multiple intelligence modules for compliance, RCA, and maintenance planning.

> Origin: ET AI Hackathon 2.0 — Problem Statement 8: AI for Industrial Knowledge Intelligence

## What is already implemented

The current codebase includes the following production-style building blocks:

- Backend API in FastAPI with routers for documents, query handling, knowledge graph access, and intelligence workflows
- Document ingestion and upload pipeline using ChromaDB for chunked retrieval over plant documents
- AI copilot experience for natural-language questions with source-backed responses and safety/risk alerts
- Knowledge graph explorer for equipment, permits, incidents, work orders, hazards, regulations, and compliance findings
- Compliance analysis, root cause analysis, lessons-learned mining, and maintenance intelligence endpoints
- A modern Next.js frontend with dashboard, copilot, graph, maintenance, risk, and compliance views
- A seeded industrial knowledge base for Visakhapatnam Fertilizer Complex with realistic operational documents and findings

## Why this matters

Industrial teams often have the data they need, but the information is scattered across documents, logs, and legacy systems. IndustrialMind is built to reduce that gap by combining:

- retrieval over unstructured technical documents
- structured relationship reasoning through a knowledge graph
- AI-assisted summarization and scenario analysis
- operational views for maintenance and compliance teams

That combination moves the project beyond a single prompt interface toward an applied industrial intelligence workflow.

## Architecture

```text
Frontend (Next.js + TypeScript + Tailwind)
    ↕ REST API
Backend (FastAPI + Python)
    ├── Document Ingestion & Vector Search (ChromaDB)
    ├── Knowledge Graph Engine (NetworkX)
    ├── AI Agent Layer (OpenAI / Groq with fallback)
    └── Intelligence Modules (Compliance, RCA, Lessons Learned, Maintenance)
```

## Repository structure

```text
backend/
  app/
    routers/          # documents, query, graph, intelligence endpoints
    services/         # rag_engine, ai_agent, knowledge_graph, rca_engine
    data/             # seeded documents and metadata
frontend/
  app/               # app shell and routes
  components/        # dashboard, copilot, graph, risk, compliance pages
  lib/               # API and UI helpers
```

## Current maturity

This is an alpha-stage but functional platform prototype.

Implemented now:
- document ingestion and indexing
- multi-page operational UI
- knowledge graph exploration
- compliance and risk-oriented reasoning
- RCA and maintenance intelligence workflows

Next milestones:
- connect to real plant systems such as CMMS, EHS, and SCADA
- replace static graph seeding with automated entity extraction and graph construction
- add authentication, audit trails, role-based access, and observability

## Seeded industrial dataset

The platform ships with a realistic synthetic dataset centered on a fertilizer complex scenario:

1. Maintenance Procedure P-101
2. Incident Report IR-2024-047
3. OISD-116 regulatory extract
4. Work order log
5. Compliance audit findings

These documents support use cases around hot-work authorization, equipment maintenance, incident learning, and compliance gap management.

## Quick start

### Backend

```bash
cd backend

# Add your API key to .env
# Choose one provider:
#   MODEL_PROVIDER=groq and GROQ_API_KEY
#   or MODEL_PROVIDER=openai and OPENAI_API_KEY

python -m app.data.seed_documents
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 after both services are running.

## Environment variables

### Backend (.env)

```env
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk-...
MODEL_PROVIDER=openai
CHROMA_PERSIST_DIR=./chroma_db
DOCUMENTS_DIR=./app/data/documents
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

### Frontend

Deploy the frontend to Vercel and point it at the backend URL:

```bash
cd frontend
vercel --prod
```

### Backend

Deploy the backend to Railway or another container host:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set the same environment variables in the deployment platform.

### Docker (local)

You can run the backend locally in Docker using the included `docker-compose.yml`.

Create a `.env` file at repository root with at least:

```env
OPENAI_API_KEY=sk-...
API_KEY=your-secret-api-key
```

Then:

```bash
docker-compose up --build
```

The backend will be available at `http://localhost:8000`. The API requires `X-API-KEY`
header when `enable_auth=true` is set in the backend `.env`.

## Tech stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Framer Motion, React Markdown
- Backend: FastAPI, Python
- AI/ML: OpenAI GPT-4o or Groq Llama models
- Vector database: ChromaDB
- Graph processing: NetworkX
- Document processing: PyPDF, pypdf

## Expected user value

IndustrialMind is meant to help teams answer questions such as:

- What is the current maintenance status of a critical asset?
- Which work orders and hazards are interacting right now?
- What compliance gaps are open and what regulations are implicated?
- What is the likely root cause of a recent incident?
- What maintenance actions should be prioritized next?

That makes it suitable for safety, maintenance, reliability, and compliance decision support rather than as a generic AI demo.
