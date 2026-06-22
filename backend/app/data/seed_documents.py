"""
Generates realistic synthetic industrial documents for the demo.
Run once: python -m app.data.seed_documents
"""
import os
import json

DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)


DOCUMENTS = {
    "maintenance_procedure_P101.txt": """
MAINTENANCE PROCEDURE — CENTRIFUGAL PUMP P-101
Document No: MP-2024-P101-REV3
Plant: Visakhapatnam Fertilizer Complex (VFC)
Unit: Ammonia Synthesis Loop — Feed Section
Asset Tag: P-101
Equipment Type: Centrifugal Pump (API 610)
Criticality: HIGH — Single-point failure risk to ammonia feed

1. SCOPE
This procedure governs planned and corrective maintenance for pump P-101, the primary
feed pump for ammonia synthesis loop. Any deviation from this procedure must be approved
by the Unit Safety Officer before work commencement.

2. SAFETY PRECAUTIONS
2.1 Isolate pump from process line using isolation valves V-101A and V-101B
2.2 Depressurise and purge with nitrogen before any seal inspection
2.3 Ensure all hot work permits are suspended within 10m radius during maintenance
2.4 Monitor for H2S: maximum allowable concentration 10 ppm (OISD-116, Clause 7.3)
2.5 Two-man rule applies — no lone worker during confined space access to pump pit

3. SCHEDULED MAINTENANCE INTERVALS
3.1 Daily: Vibration check — alarm if >7.1 mm/s RMS (ISO 10816-3 Zone B limit)
3.2 Weekly: Bearing temperature — alarm if >75°C, trip if >90°C
3.3 Monthly: Mechanical seal inspection — replace if leak rate >10 drops/min
3.4 Quarterly: Impeller clearance measurement — tolerance 0.3mm ± 0.05mm
3.5 Annual: Full overhaul including bearing replacement, alignment check

4. LAST KNOWN MAINTENANCE RECORDS
4.1 Last annual overhaul: 14-March-2024 — Bearing replaced (SKF 6314-2Z), alignment OK
4.2 Last seal inspection: 22-November-2024 — Seal Type 2 replaced (John Crane T21)
4.3 Vibration reading (last 30 days avg): 5.8 mm/s RMS — within Zone B
4.4 Bearing temperature (last reading): 68°C — within limits

5. KNOWN ISSUES / OPEN WORK ORDERS
5.1 WO-2024-1847: Minor seal weep noted 18-December-2024 — monitor until next inspection
5.2 WO-2024-1901: Suction strainer fouling suspected — schedule cleaning Feb 2025
5.3 NOTE: P-101 has shown a pattern of bearing wear acceleration during summer months
    (May-August). Root cause analysis WO-2023-0892 attributed to cooling water quality.

6. REGULATORY COMPLIANCE
6.1 Covered under Factory Act 1948, Schedule I (hazardous processes)
6.2 OISD-116 Section 7: Rotating equipment safety — last audit PASSED (Sep-2024)
6.3 Next statutory inspection due: March-2025

7. SPARE PARTS LIST
7.1 Bearing: SKF 6314-2Z (critical spare — minimum 2 units in store)
7.2 Mechanical Seal: John Crane T21 (1 unit in store — REORDER REQUIRED)
7.3 Gasket Set: VFC-P101-GS-003 (2 sets available)
""",

    "incident_report_IR2024_047.txt": """
INCIDENT INVESTIGATION REPORT
Report No: IR-2024-047
Plant: Visakhapatnam Fertilizer Complex (VFC)
Date of Incident: 07-August-2024
Location: Ammonia Synthesis Loop — Area 3, Near P-103 / Heat Exchanger HE-301
Incident Classification: Near-Miss (High Potential)
Reported by: Shift Supervisor T. Ramachandran
Investigated by: Safety Officer K. Prasad, Maintenance Manager R. Singh

1. INCIDENT DESCRIPTION
At 14:35 IST on 07-August-2024, the area gas detector GD-303 alarmed at 45 ppm NH3
(alarm threshold: 25 ppm). Simultaneously, maintenance crew was executing Work Order
WO-2024-1102 (mechanical seal replacement on P-103) under Hot Work Permit HWP-2024-089.
The combination of elevated NH3 concentration and active hot work in the same zone created
a compound hazard condition that required immediate evacuation of Area 3.

2. TIMELINE
14:20 — WO-2024-1102 commenced. Hot work permit HWP-2024-089 active.
14:30 — GD-303 first reading: 18 ppm NH3 (below alarm threshold, not flagged)
14:35 — GD-303 alarm: 45 ppm NH3. Hot work suspended. Area evacuation ordered.
14:42 — Source identified: small flange leak on HE-301 inlet (unrelated to ongoing WO)
14:55 — Area cleared. Gas concentration returned to <5 ppm.
15:10 — All-clear issued. Work permit re-evaluated before resuming.

3. ROOT CAUSE ANALYSIS
3.1 Immediate Cause: HE-301 inlet flange gasket micro-failure causing NH3 release
3.2 Contributing Factor 1: No real-time cross-reference between active gas readings
    and concurrent hot work permits — safety officer was not alerted at 18 ppm reading
    because it was below the standalone alarm threshold
3.3 Contributing Factor 2: Work Order WO-2024-1102 was issued without checking
    GD-303's last 48h trend (slight upward drift from 3 ppm to 8 ppm pre-incident)
3.4 Contributing Factor 3: HE-301 last inspected 14 months ago (overdue by 2 months)

4. CORRECTIVE ACTIONS
4.1 IMMEDIATE: HE-301 flange gasket replaced. Torque verification completed. [CLOSED]
4.2 SHORT-TERM: Inspection frequency for HE-301 increased to 6-monthly. [OPEN]
4.3 SYSTEMIC: Recommend implementing compound risk check before issuing hot work
    permits — cross-reference gas sensor trends (not just threshold alarms) with
    active permit zones. [OPEN — assigned to digital safety team]
4.4 SYSTEMIC: Review all permits active within 15m of any sensor showing >50% of
    alarm threshold. [OPEN]

5. REGULATORY NOTIFICATION
5.1 Near-miss reported to DISH (Directorate of Industrial Safety and Health) per
    Factory Act Section 88A — filed 09-August-2024
5.2 OISD-116 Clause 12.4 (hot work near hazardous gas zones) — procedure gap identified

6. LESSONS LEARNED
The critical failure was not a sensor failure — GD-303 functioned correctly. The failure
was the absence of an intelligence layer to correlate sub-threshold gas readings with
concurrent hot work permit activity. Had the system flagged the 18 ppm reading in context
of active HWP-2024-089, the compound risk would have been identified 5 minutes earlier.
""",

    "oisd_116_extract.txt": """
OISD STANDARD 116 — FIRE PREVENTION AND PROTECTION SYSTEM FOR
PETROLEUM REFINERIES AND OIL/GAS PROCESSING PLANTS
(Relevant Extracts — Ammonia and Gas Handling Facilities)

SECTION 7: SAFETY IN ROTATING EQUIPMENT OPERATIONS

7.1 All rotating equipment in hazardous area classification Zone 1 and Zone 2 must be
    fitted with automatic vibration monitoring systems. Alarm setpoints must be per
    ISO 10816-3. Trip setpoints must be set at 150% of Zone B upper limit.

7.2 Mechanical seals on pumps handling toxic or flammable media must be inspected at
    intervals not exceeding 90 days. Any detected leak exceeding 5 drops/minute must
    trigger a work order within 24 hours.

7.3 Maximum permissible H2S concentration for personnel entry: 10 ppm (8-hour TWA).
    Immediately Dangerous to Life or Health (IDLH): 100 ppm. 
    Any area reading >50 ppm must trigger immediate evacuation.

7.4 Ammonia (NH3) alarm thresholds:
    Level 1 Alert: 25 ppm — notify safety officer, review active permits in zone
    Level 2 Alarm: 50 ppm — suspend all hot work, prepare for evacuation
    Level 3 Emergency: 100 ppm — mandatory evacuation, emergency response activation

SECTION 12: HOT WORK PERMIT SYSTEM

12.1 No hot work permit shall be issued without a gas test conducted within 1 hour
     of work commencement. Gas tests must be repeated every 2 hours for continuous work.

12.2 Hot work permits must not be issued in areas where toxic gas concentration exceeds
     25% of the Lower Explosive Limit (LEL) or 10 ppm for H2S / 25 ppm for NH3.

12.3 Permit issuing authority must verify that no concurrent maintenance activity on
     adjacent equipment could create compound hazard conditions.

12.4 HOT WORK NEAR HAZARDOUS GAS ZONES: If any gas detector within 15 meters of
     the hot work zone has recorded readings above 50% of Level 1 Alert threshold
     in the preceding 4 hours, permit issuance requires additional sign-off from
     the Plant Safety Officer (not just the Shift Supervisor).

12.5 Permit-to-Work (PTW) system must maintain a log of all concurrent permits
     active in any defined zone at any given time. This log must be accessible
     to all permit issuers in real-time.

SECTION 18: INSPECTION AND TESTING

18.1 Heat exchangers in hazardous fluid service must be inspected per ASME PCC-2.
     Maximum inspection interval: 12 months. Any equipment showing wall thickness
     below minimum design thickness must be taken out of service immediately.

18.2 Flange connections in toxic service (NH3, H2S, HF) must undergo leak detection
     survey using appropriate detector at intervals not exceeding 6 months.

18.3 Risk-based inspection (RBI) may be used to extend intervals beyond standard
     schedule with documented engineering justification and Safety Officer approval.

SECTION 22: CONTRACTOR SAFETY MANAGEMENT

22.1 All contractor personnel must complete site-specific induction before commencing
     work. Induction records must be maintained for 3 years.

22.2 Contractors executing work under hot work, confined space, or height permits
     must have competent supervisor present at all times.

22.3 Contractor performance (including near-miss reporting) must be reviewed quarterly.
""",

    "work_orders_log.txt": """
WORK ORDER LOG — Visakhapatnam Fertilizer Complex (VFC)
Extract: Last 90 days — Area 3, Ammonia Synthesis Loop
Generated: 22-December-2024

WO-2024-1785 | Asset: P-101 | Type: Preventive | Status: CLOSED
Description: Quarterly vibration analysis and bearing temperature check
Findings: Vibration 5.8 mm/s (within limits). Bearing temp 68°C (within limits).
Completed: 01-Dec-2024 | Technician: R. Mohan

WO-2024-1801 | Asset: HE-301 | Type: Corrective | Status: OPEN
Description: Flange gasket replacement following IR-2024-047 incident
Priority: HIGH | Due: 05-Jan-2025 | Assigned: M. Krishnan
Note: Interim monthly leak survey ordered until gasket replacement complete

WO-2024-1847 | Asset: P-101 | Type: Corrective | Status: OPEN (Monitor)
Description: Minor seal weep noted during routine inspection
Findings: 3-4 drops/min — below 5 drop/min OISD threshold but trending up
Priority: MEDIUM | Due: 15-Feb-2025 | Assigned: R. Mohan
Note: Seal spares inventory — John Crane T21 at ZERO stock. REORDER TRIGGERED.

WO-2024-1901 | Asset: P-101 | Type: Predictive | Status: OPEN
Description: Suction strainer suspected fouling — differential pressure rising
Findings: dP across strainer: 0.8 bar (normal: 0.3-0.5 bar)
Priority: MEDIUM | Due: 10-Feb-2025 | Assigned: TBD
Note: Trending analysis shows 30% increase in dP over past 6 weeks

WO-2024-1923 | Asset: GD-303 | Type: Calibration | Status: CLOSED
Description: Routine 6-monthly calibration of NH3 gas detector
Findings: Calibration within spec. Zero drift: 0.3 ppm (limit: 1 ppm). PASS.
Completed: 15-Dec-2024 | Technician: Instrumentation Team

WO-2024-1955 | Asset: HE-301 | Type: Inspection | Status: OPEN
Description: Wall thickness measurement following increased inspection frequency
Priority: HIGH | Due: 15-Jan-2025 | Assigned: NDT Team (external contractor)
Note: Requires confined space entry permit + gas clearance certificate
Contractor: Bharat NDT Services — site induction due before work start

WO-2024-1967 | Asset: V-101A | Type: Preventive | Status: OPEN
Description: Isolation valve V-101A — actuator maintenance
Note: V-101A is P-101 isolation valve. Simultaneous maintenance of V-101A and
      P-101 must NOT occur — creates single-point isolation failure risk.
Priority: LOW | Due: 28-Feb-2025

PERMIT HISTORY (Last 30 days):
HWP-2024-115: Hot Work — Welding repair on pipe rack PR-5 | CLOSED | 10-Dec-2024
HWP-2024-118: Hot Work — Flange bolt replacement HE-301 | OPEN | Active since 20-Dec-2024
CSP-2024-089: Confined Space — Vessel V-202 cleaning | CLOSED | 05-Dec-2024
EWP-2024-201: Electrical Work — MCC-3 panel maintenance | OPEN | Active since 18-Dec-2024
""",

    "regulatory_compliance_audit.txt": """
SAFETY AND REGULATORY COMPLIANCE AUDIT REPORT
Audit Reference: VFC-AUDIT-2024-Q3
Plant: Visakhapatnam Fertilizer Complex (VFC)
Audit Period: July - September 2024
Audited by: Internal Safety Team + DISH Inspector (as observer)
Date of Report: 15-October-2024

EXECUTIVE SUMMARY
Overall Compliance Score: 76% (Target: 90%)
Critical Non-Conformances: 2
Major Non-Conformances: 5
Minor Observations: 12

CRITICAL NON-CONFORMANCES (Require immediate action)

CNC-2024-01: OISD-116 Section 12.4 — Permit-to-Work Cross-Reference
Finding: Investigation of IR-2024-047 (near-miss, Aug 2024) revealed that the
PTW system has no mechanism to cross-reference active permits with real-time gas
sensor data. Permit issuers rely on point-in-time gas tests rather than trending.
Regulation: OISD-116 Clause 12.4, 12.5
Risk: HIGH — potential for compound hazard conditions to go undetected
Corrective Action Required: Implement automated PTW-sensor cross-reference system
Target Date: 31-March-2025
Status: OPEN

CNC-2024-02: Factory Act 1948, Section 41B — Hazard Identification System
Finding: Current HAZOP documentation for Ammonia Synthesis Loop last updated in
2019. Process modifications in 2022 (revamp of HE-301 circuit) were not reflected
in HAZOP update. This represents a significant gap in process safety documentation.
Regulation: Factory Act 1948, Section 41B; OISD-105 Clause 4.2
Risk: HIGH — process safety basis potentially invalid for current configuration
Corrective Action Required: HAZOP revalidation for modified circuits
Target Date: 30-June-2025
Status: OPEN

MAJOR NON-CONFORMANCES

MNC-2024-01: OISD-116 Section 18.2 — HE-301 Flange Inspection Overdue
Finding: HE-301 flange leak detection survey last performed 14 months ago.
Standard requires 6-monthly survey for NH3 service.
Status: CLOSED (post-incident action taken)

MNC-2024-02: Spare Parts Criticality — P-101 Mechanical Seal
Finding: John Crane T21 seal (critical spare for P-101) at zero stock.
OISD best practice requires minimum 1 unit on hand for critical rotating equipment.
Status: OPEN — purchase order raised, ETA 6 weeks

MNC-2024-03: Contractor Induction Records — NDT Team
Finding: Bharat NDT Services — 2 of 4 technicians lack current site induction
(>12 months since last induction). Cannot perform confined space work.
Status: OPEN — induction scheduled January 2025

MNC-2024-04: Emergency Response Drill — Area 3
Finding: Last NH3 release drill in Area 3 was 18 months ago. Factory Act
requires annual emergency drill for hazardous zones.
Status: OPEN — drill scheduled February 2025

MNC-2024-05: DGMS Statutory Return — Q2 2024
Finding: Q2 2024 statutory safety return to DGMS submitted 22 days late.
Status: CLOSED (submitted with explanation)

COMPLIANCE TRACKING SUMMARY
Standard          | Clauses Audited | Compliant | Non-Compliant | Score
OISD-116          | 45              | 38        | 7             | 84%
Factory Act 1948  | 22              | 16        | 6             | 73%
OISD-105          | 18              | 12        | 6             | 67%
DGMS Guidelines   | 10              | 8         | 2             | 80%
OVERALL           | 95              | 74        | 21            | 76%

NEXT AUDIT: January 2025 (focused re-audit on CNC-2024-01 and CNC-2024-02)
"""
}


def seed():
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    for filename, content in DOCUMENTS.items():
        filepath = os.path.join(DOCUMENTS_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content.strip())
        print(f"Created: {filepath}")

    # Create metadata index
    metadata = [
        {
            "filename": "maintenance_procedure_P101.txt",
            "doc_type": "Maintenance Procedure",
            "asset_tag": "P-101",
            "plant": "VFC",
            "last_updated": "2024-12-01",
            "criticality": "HIGH"
        },
        {
            "filename": "incident_report_IR2024_047.txt",
            "doc_type": "Incident Report",
            "asset_tag": "P-103,HE-301",
            "plant": "VFC",
            "last_updated": "2024-08-09",
            "criticality": "HIGH"
        },
        {
            "filename": "oisd_116_extract.txt",
            "doc_type": "Regulatory Standard",
            "asset_tag": "ALL",
            "plant": "ALL",
            "last_updated": "2024-01-01",
            "criticality": "REGULATORY"
        },
        {
            "filename": "work_orders_log.txt",
            "doc_type": "Work Order Log",
            "asset_tag": "P-101,HE-301,GD-303,V-101A",
            "plant": "VFC",
            "last_updated": "2024-12-22",
            "criticality": "MEDIUM"
        },
        {
            "filename": "regulatory_compliance_audit.txt",
            "doc_type": "Compliance Audit",
            "asset_tag": "ALL",
            "plant": "VFC",
            "last_updated": "2024-10-15",
            "criticality": "HIGH"
        }
    ]

    with open(os.path.join(DOCUMENTS_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    print("Created: metadata.json")
    print(f"\nAll {len(DOCUMENTS)} documents seeded successfully.")


if __name__ == "__main__":
    seed()
