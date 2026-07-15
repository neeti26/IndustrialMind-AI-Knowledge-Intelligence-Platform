"""SCADA connector stub for ingesting telemetry data.

In a real system, this would connect to a live SCADA/DCS system (OPC-UA, Modbus, etc.)
For now, we provide a mock that accepts JSON telemetry payloads and adds them to the knowledge graph.
"""
from typing import List, Dict
from datetime import datetime


def parse_scada_telemetry(payload: Dict) -> List[Dict]:
    """Parse SCADA telemetry JSON into structured readings.
    
    Expected format:
    {
        "timestamp": "2024-12-20T10:30:00Z",
        "equipment_id": "P-101",
        "readings": [
            {"tag": "PRESSURE", "value": 45.2, "unit": "psi", "status": "OK"},
            {"tag": "TEMPERATURE", "value": 120.5, "unit": "C", "status": "ALERT"},
        ]
    }
    """
    results = []
    ts = payload.get("timestamp", datetime.utcnow().isoformat())
    eq = payload.get("equipment_id", "UNKNOWN")
    for reading in payload.get("readings", []):
        results.append({
            "equipment_id": eq,
            "tag": reading.get("tag"),
            "value": reading.get("value"),
            "unit": reading.get("unit"),
            "status": reading.get("status", "OK"),
            "timestamp": ts,
        })
    return results


def ingest_scada_into_graph(telemetry: List[Dict], graph) -> int:
    """Add telemetry readings to knowledge graph as TelemetryReading nodes.
    
    Returns count of readings added.
    """
    added = 0
    for reading in telemetry:
        eq_id = reading.get("equipment_id")
        tag = reading.get("tag")
        value = reading.get("value")
        ts = reading.get("timestamp")
        
        # Create a telemetry node
        node_id = f"TELEM-{eq_id}-{tag}-{ts}".replace(":", "-")
        if not graph.has_node(node_id):
            graph.add_node(
                node_id,
                type="TelemetryReading",
                label=f"{tag} @ {eq_id}",
                value=value,
                unit=reading.get("unit"),
                status=reading.get("status"),
                timestamp=ts,
            )
            added += 1
        
        # Link to equipment if it exists
        if eq_id and graph.has_node(eq_id):
            graph.add_edge(eq_id, node_id, relation="HAS_TELEMETRY")
    
    return added
