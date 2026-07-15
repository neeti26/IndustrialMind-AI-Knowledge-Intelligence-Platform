from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from app.config import get_settings

router = APIRouter(prefix="/integrations", tags=["integrations"])
settings = get_settings()


@router.post('/cmms/upload')
async def upload_cmms(file: UploadFile = File(...)):
    """Upload a CMMS CSV export and ingest work orders into the knowledge graph."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='Only CSV uploads are supported')

    docs_dir = settings.documents_dir
    os.makedirs(docs_dir, exist_ok=True)
    out_path = os.path.join(docs_dir, file.filename)
    content = await file.read()
    with open(out_path, 'wb') as f:
        f.write(content)

    # parse and ingest
    from app.services.cmms_connector import parse_work_orders_csv, ingest_work_orders_into_graph
    from app.services import knowledge_graph as kg

    try:
        wos = parse_work_orders_csv(out_path)
        G = kg.get_graph()
        added = ingest_work_orders_into_graph(wos, G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "ingested_work_orders": len(wos), "nodes_added": added}
