"""
Entity Extractor — NLP-based extraction of industrial entities from document text.
Extracts: equipment tags, work order numbers, incident IDs, dates, people,
regulatory references, hazardous materials, and alarm thresholds.

Uses regex + domain rules for reliable extraction without external NLP dependencies.
In production, augment with spaCy or a fine-tuned BERT model for higher recall.
"""
import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ExtractedEntities:
    equipment_tags: list[str] = field(default_factory=list)
    work_orders: list[str] = field(default_factory=list)
    incident_ids: list[str] = field(default_factory=list)
    permit_ids: list[str] = field(default_factory=list)
    regulations: list[str] = field(default_factory=list)
    dates: list[str] = field(default_factory=list)
    people: list[str] = field(default_factory=list)
    chemicals: list[str] = field(default_factory=list)
    thresholds: list[dict] = field(default_factory=list)
    standards: list[str] = field(default_factory=list)
    compliance_ids: list[str] = field(default_factory=list)
    doc_type: Optional[str] = None


# ── PATTERNS ─────────────────────────────────────────────────────────────────

# Equipment tags: P-101, HE-301, GD-303, V-101A, XV-301A, PSV-301, FIC-201
EQUIP_PATTERN = re.compile(
    r'\b([A-Z]{1,4}-\d{3,4}[A-Z]?)\b'
)

# Work orders: WO-2024-1847, WO-YYYY-NNNN
WO_PATTERN = re.compile(
    r'\b(WO-\d{4}-\d{3,6})\b'
)

# Incident reports: IR-2024-047
IR_PATTERN = re.compile(
    r'\b(IR-\d{4}-\d{3,6})\b'
)

# Permit IDs: HWP-2024-089, CSP-2024-089, EWP-2024-201
PERMIT_PATTERN = re.compile(
    r'\b([A-Z]{2,3}P-\d{4}-\d{3,6})\b'
)

# Regulatory references: OISD-116, OISD-116 Section 7, Factory Act 1948, ASME PCC-2
REG_CLAUSE_PATTERN = re.compile(
    r'\b(OISD[-\s]\d{2,4}(?:\s+(?:Section|Clause|Sec)\s+[\d.]+)?'
    r'|Factory Act\s+\d{4}(?:\s+(?:Section|S\.)\s*[\d]+[A-Z]?)?'
    r'|ASME\s+[A-Z]+[-\s]\d+'
    r'|ISO\s+\d{3,6}(?:[-\s]\d+)?'
    r'|DGMS(?:\s+Guidelines?)?'
    r'|TEMA\s+Class\s+[A-Z]'
    r'|API\s+\d{3})\b',
    re.IGNORECASE
)

# Compliance findings: CNC-2024-01, MNC-2024-02
COMPLIANCE_PATTERN = re.compile(
    r'\b([CM]NC-\d{4}-\d{2,4})\b'
)

# Dates: DD-Month-YYYY, YYYY-MM-DD, Month-YYYY
DATE_PATTERN = re.compile(
    r'\b(\d{1,2}-(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)-\d{4}'
    r'|\d{4}-\d{2}-\d{2}'
    r'|\d{2}/\d{2}/\d{4})\b',
    re.IGNORECASE
)

# People: Name followed by role or reporting context
PEOPLE_PATTERN = re.compile(
    r'(?:by|from|officer|supervisor|manager|inspector|engineer|technician)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)',
    re.IGNORECASE
)

# Chemicals: NH3, H2S, HF, ammonia, hydrogen sulfide etc.
CHEMICAL_PATTERN = re.compile(
    r'\b(NH3|H2S|HF|hydrogen\s+sulfide|ammonia|hydrofluoric\s+acid|methanol|chlorine|Cl2|CO|CO2)\b',
    re.IGNORECASE
)

# Thresholds: "45 ppm NH3", ">7.1 mm/s", "<5 ppm", "68°C"
THRESHOLD_PATTERN = re.compile(
    r'(\d+(?:\.\d+)?)\s*(ppm|mm/s|°C|kg/cm²g?|bar|mm|%|drops/min|m/s)\s*(?:(NH3|H2S|RMS|HF|TWA))?',
    re.IGNORECASE
)

# Standards that are just references: OISD-116, TEMA, API
STANDARD_PATTERN = re.compile(
    r'\b(OISD-\d{2,4}|ASME\s+\w+|ISO\s+\d{3,6}|API\s+\d{3}|TEMA\s+Class\s+[A-Z]|DGMS)\b',
    re.IGNORECASE
)


def extract_entities(text: str, doc_type: Optional[str] = None) -> ExtractedEntities:
    """Extract all industrial entities from raw document text."""
    result = ExtractedEntities(doc_type=doc_type)

    result.equipment_tags = sorted(set(EQUIP_PATTERN.findall(text)))
    result.work_orders = sorted(set(WO_PATTERN.findall(text)))
    result.incident_ids = sorted(set(IR_PATTERN.findall(text)))
    result.permit_ids = sorted(set(PERMIT_PATTERN.findall(text)))
    result.compliance_ids = sorted(set(COMPLIANCE_PATTERN.findall(text)))

    reg_matches = REG_CLAUSE_PATTERN.findall(text)
    result.regulations = sorted(set(m.strip() for m in reg_matches))

    result.dates = sorted(set(DATE_PATTERN.findall(text)))[:10]  # cap at 10
    result.people = sorted(set(PEOPLE_PATTERN.findall(text)))

    chem_matches = CHEMICAL_PATTERN.findall(text)
    result.chemicals = sorted(set(c.upper() if c.upper() in ("NH3","H2S","HF","CO","CO2") else c.lower() for c in chem_matches))

    threshold_matches = THRESHOLD_PATTERN.findall(text)
    result.thresholds = [
        {"value": m[0], "unit": m[1], "substance": m[2] or None}
        for m in threshold_matches[:15]
    ]

    std_matches = STANDARD_PATTERN.findall(text)
    result.standards = sorted(set(s.strip() for s in std_matches))

    return result


def entities_to_dict(e: ExtractedEntities) -> dict:
    return {
        "equipment_tags": e.equipment_tags,
        "work_orders": e.work_orders,
        "incident_ids": e.incident_ids,
        "permit_ids": e.permit_ids,
        "compliance_ids": e.compliance_ids,
        "regulations": e.regulations,
        "dates": e.dates,
        "people": e.people,
        "chemicals": e.chemicals,
        "thresholds": e.thresholds,
        "standards": e.standards,
        "doc_type": e.doc_type,
        "total_entities": (
            len(e.equipment_tags) + len(e.work_orders) + len(e.incident_ids) +
            len(e.permit_ids) + len(e.compliance_ids) + len(e.regulations)
        )
    }


def extract_from_file(filepath: str, doc_type: Optional[str] = None) -> dict:
    """Extract entities from a file path."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        entities = extract_entities(text, doc_type)
        return entities_to_dict(entities)
    except Exception as e:
        return {"error": str(e)}
