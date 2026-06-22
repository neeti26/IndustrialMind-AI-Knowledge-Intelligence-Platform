#!/bin/bash
set -e
cd backend
echo "Seeding documents..."
python -m app.data.seed_documents
echo "Starting IndustrialMind API on port ${PORT:-8000}..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
