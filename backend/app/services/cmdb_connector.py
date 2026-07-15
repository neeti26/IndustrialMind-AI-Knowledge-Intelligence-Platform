"""CMDB connector stub for Configuration Management Database integration.

Maps IT/OT assets, software versions, configurations, and dependencies.
In production, this would integrate with real CMDB systems (ServiceNow, BMC, etc.).
"""
from typing import List, Dict


def parse_cmdb_assets(payload: Dict) -> List[Dict]:
    """Parse CMDB asset JSON into structured format.
    
    Expected format:
    {
        "assets": [
            {
                "asset_id": "ASSET-001",
                "name": "PLC-Area3-Main",
                "type": "PLC",
                "manufacturer": "Siemens",
                "model": "S7-1200",
                "software_version": "4.5.1",
                "status": "ACTIVE",
                "location": "Area 3"
            }
        ]
    }
    """
    return payload.get("assets", [])


def parse_cmdb_dependencies(payload: Dict) -> List[Dict]:
    """Parse CMDB dependency relationships.
    
    Expected format:
    {
        "dependencies": [
            {"source": "PLC-001", "target": "NETWORK-SWITCH-1", "type": "CONNECTED_TO"},
            {"source": "P-101", "target": "PLC-001", "type": "CONTROLLED_BY"}
        ]
    }
    """
    return payload.get("dependencies", [])


def ingest_cmdb_into_graph(assets: List[Dict], dependencies: List[Dict], graph) -> Dict:
    """Add CMDB assets and dependencies to knowledge graph.
    
    Returns dict with counts of assets and edges added.
    """
    assets_added = 0
    deps_added = 0
    
    # Add asset nodes
    for asset in assets:
        asset_id = asset.get("asset_id")
        if asset_id and not graph.has_node(asset_id):
            graph.add_node(
                asset_id,
                type="CMDBAsset",
                label=asset.get("name", asset_id),
                asset_type=asset.get("type"),
                manufacturer=asset.get("manufacturer"),
                model=asset.get("model"),
                software_version=asset.get("software_version"),
                status=asset.get("status"),
                location=asset.get("location"),
            )
            assets_added += 1
    
    # Add dependency edges
    for dep in dependencies:
        source = dep.get("source")
        target = dep.get("target")
        dep_type = dep.get("type", "RELATED_TO")
        
        # Ensure nodes exist
        if source and not graph.has_node(source):
            graph.add_node(source, type="CMDBAsset", label=source)
        if target and not graph.has_node(target):
            graph.add_node(target, type="CMDBAsset", label=target)
        
        # Add edge
        if source and target:
            graph.add_edge(source, target, relation=dep_type)
            deps_added += 1
    
    return {"assets_added": assets_added, "dependencies_added": deps_added}
