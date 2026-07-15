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

    # Audit the upload
    try:
        os.makedirs(os.path.dirname(settings.audit_log_path), exist_ok=True)
        with open(settings.audit_log_path, "a", encoding="utf-8") as f:
            f.write(f"UPLOAD\tCMMS\t{file.filename}\t{len(wos)} WOs\n")
    except Exception:
        pass

    return {"status": "ok", "ingested_work_orders": len(wos), "nodes_added": added}


@router.post('/scada/ingest')
async def ingest_scada(payload: dict):
    """Ingest SCADA telemetry data into the knowledge graph.
    
    Expected payload:
    {
        "timestamp": "2024-12-20T10:30:00Z",
        "equipment_id": "P-101",
        "readings": [
            {"tag": "PRESSURE", "value": 45.2, "unit": "psi", "status": "OK"}
        ]
    }
    """
    from app.services.scada_connector import parse_scada_telemetry, ingest_scada_into_graph
    from app.services import knowledge_graph as kg

    try:
        telemetry = parse_scada_telemetry(payload)
        G = kg.get_graph()
        added = ingest_scada_into_graph(telemetry, G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Audit
    try:
        os.makedirs(os.path.dirname(settings.audit_log_path), exist_ok=True)
        with open(settings.audit_log_path, "a", encoding="utf-8") as f:
            f.write(f"INGEST\tSCADA\t{payload.get('equipment_id', 'unknown')}\t{len(telemetry)} readings\n")
    except Exception:
        pass

    return {"status": "ok", "ingested_readings": len(telemetry), "nodes_added": added}


@router.post('/cmdb/ingest')
async def ingest_cmdb(payload: dict):
    """Ingest CMDB assets and dependencies into the knowledge graph.
    
    Expected payload:
    {
        "assets": [
            {"asset_id": "PLC-001", "name": "Main PLC", "type": "PLC", "status": "ACTIVE"}
        ],
        "dependencies": [
            {"source": "P-101", "target": "PLC-001", "type": "CONTROLLED_BY"}
        ]
    }
    """
    from app.services.cmdb_connector import parse_cmdb_assets, parse_cmdb_dependencies, ingest_cmdb_into_graph
    from app.services import knowledge_graph as kg

    try:
        assets = parse_cmdb_assets(payload)
        deps = parse_cmdb_dependencies(payload)
        G = kg.get_graph()
        result = ingest_cmdb_into_graph(assets, deps, G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Audit
    try:
        os.makedirs(os.path.dirname(settings.audit_log_path), exist_ok=True)
        with open(settings.audit_log_path, "a", encoding="utf-8") as f:
            f.write(f"INGEST\tCMDB\t{len(assets)} assets, {len(deps)} deps\n")
    except Exception:
        pass

    return {"status": "ok", **result}
