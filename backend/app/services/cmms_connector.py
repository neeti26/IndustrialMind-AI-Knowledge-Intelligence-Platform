"""Simple CMMS connector scaffold

Parses CSV exports from a CMMS and returns structured work orders. Intended
as a starting point for integrating real CMMS systems.
"""
import csv
from typing import List, Dict


def parse_work_orders_csv(path: str) -> List[Dict[str, str]]:
    results = []
    with open(path, newline='', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for r in reader:
            # Normalize expected fields
            wo = {
                'work_order_id': r.get('work_order_id') or r.get('WO') or r.get('workorder') or r.get('work_order') or r.get('id'),
                'asset_tag': r.get('asset_tag') or r.get('asset') or r.get('equipment'),
                'description': r.get('description') or r.get('desc') or r.get('work_description'),
                'priority': r.get('priority') or r.get('prio'),
                'due_date': r.get('due_date') or r.get('due') or r.get('target_date'),
                'status': r.get('status') or 'OPEN'
            }
            results.append(wo)
    return results


def ingest_work_orders_into_graph(work_orders: List[Dict[str, str]], graph):
    """Add work orders to provided NetworkX graph instance.

    Returns count of nodes added.
    """
    added = 0
    for wo in work_orders:
        wid = wo.get('work_order_id') or f"WO-{hash(str(wo))%100000}"
        if not graph.has_node(wid):
            graph.add_node(wid, type='WorkOrder', label=wid, description=wo.get('description',''), status=wo.get('status','OPEN'), priority=wo.get('priority',''))
            added += 1
        asset = wo.get('asset_tag')
        if asset:
            if not graph.has_node(asset):
                graph.add_node(asset, type='Equipment', label=asset)
            graph.add_edge(asset, wid, relation='HAS_OPEN_WO')
    return added
