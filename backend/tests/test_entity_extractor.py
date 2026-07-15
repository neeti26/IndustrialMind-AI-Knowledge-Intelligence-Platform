import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import entity_extractor


def test_extract_entities_basic():
    sample = "Pump P-101 experienced seal weep. WO-2024-1847 opened. IR-2024-047 referenced. NH3 45 ppm detected."
    res = entity_extractor.extract_entities(sample)
    d = entity_extractor.entities_to_dict(res)
    assert 'P-101' in d['equipment_tags'] or any('P-101' in e for e in d['equipment_tags'])
    assert 'WO-2024-1847' in d['work_orders']
    assert 'IR-2024-047' in d['incident_ids']
    assert any('NH3' in c for c in d['chemicals'])
