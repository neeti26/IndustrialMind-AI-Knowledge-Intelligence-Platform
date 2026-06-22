from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services import knowledge_graph as kg

router = APIRouter(prefix="/graph", tags=["knowledge-graph"])


@router.get("/full")
async def get_full_graph():
    """Return the full knowledge graph for visualization."""
    try:
        G = kg.get_graph()
        return kg.graph_to_vis_format(G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/asset/{asset_id}")
async def get_asset_subgraph(asset_id: str, depth: int = 2):
    """Return subgraph centered on a specific asset."""
    try:
        return kg.get_subgraph_for_asset(asset_id, depth=depth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance-gaps")
async def get_compliance_gaps():
    """Return all open compliance findings with regulatory links."""
    try:
        return {"gaps": kg.get_compliance_gaps()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hazards")
async def get_hazards():
    """Return active compound hazards."""
    try:
        return {"hazards": kg.get_active_hazards()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_graph_stats():
    """Return knowledge graph statistics."""
    try:
        return kg.get_graph_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nodes")
async def get_nodes_by_type(node_type: Optional[str] = None):
    """Return nodes filtered by type."""
    G = kg.get_graph()
    nodes = []
    for node_id, data in G.nodes(data=True):
        if node_type is None or data.get("type") == node_type:
            nodes.append({"id": node_id, **data})
    return {"nodes": nodes, "total": len(nodes)}
