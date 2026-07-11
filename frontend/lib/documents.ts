/**
 * Industrial document corpus — embedded directly for Vercel serverless.
 * In production scale-up: swap for a vector DB (Pinecone, Supabase pgvector).
 */

export interface DocChunk {
  id: string;
  filename: string;
  doc_type: string;
  asset_tag: string;
  content: string;
}

export const DOCUMENT_CHUNKS: DocChunk[] = [
  // ── MAINTENANCE PROCEDURE P-101 ──────────────────────────────────────────
  {
    id: "mp_p101_0",
    filename: "maintenance_procedure_P101.txt",
    doc_type: "Maintenance Procedure",
    asset_tag: "P-101",
    content: `MAINTENANCE PROCEDURE — CENTRIFUGAL PUMP P-101. Document No: MP-2024-P101-REV3. Plant: Visakhapatnam Fertilizer Complex (VFC). Unit: Ammonia Synthesis Loop — Feed Section. Asset Tag: P-101. Equipment Type: Centrifugal Pump (API 610). Criticality: HIGH — Single-point failure risk to ammonia feed. SCOPE: This procedure governs planned and corrective maintenance for pump P-101, the primary feed pump for ammonia synthesis loop. Any deviation must be approved by the Unit Safety Officer before work commencement.`,
  },
  {
    id: "mp_p101_1",
    filename: "maintenance_procedure_P101.txt",
    doc_type: "Maintenance Procedure",
    asset_tag: "P-101",
    content: `P-101 SAFETY PRECAUTIONS: Isolate pump using isolation valves V-101A and V-101B. Depressurise and purge with nitrogen before any seal inspection. Ensure all hot work permits are suspended within 10m radius during maintenance. Monitor for H2S: maximum allowable concentration 10 ppm per OISD-116 Clause 7.3. Two-man rule applies — no lone worker during confined space access to pump pit.`,
  },
  {
    id: "mp_p101_2",
    filename: "maintenance_procedure_P101.txt",
    doc_type: "Maintenance Procedure",
    asset_tag: "P-101",
    content: `P-101 SCHEDULED MAINTENANCE INTERVALS: Daily: Vibration check — alarm if >7.1 mm/s RMS (ISO 10816-3 Zone B limit). Weekly: Bearing temperature — alarm if >75°C, trip if >90°C. Monthly: Mechanical seal inspection — replace if leak rate >10 drops/min. Quarterly: Impeller clearance measurement — tolerance 0.3mm ± 0.05mm. Annual: Full overhaul including bearing replacement, alignment check.`,
  },
  {
    id: "mp_p101_3",
    filename: "maintenance_procedure_P101.txt",
    doc_type: "Maintenance Procedure",
    asset_tag: "P-101",
    content: `P-101 MAINTENANCE RECORDS: Last annual overhaul: 14-March-2024 — Bearing replaced (SKF 6314-2Z), alignment OK. Last seal inspection: 22-November-2024 — Seal Type 2 replaced (John Crane T21). Vibration reading (last 30 days avg): 5.8 mm/s RMS — within Zone B. Bearing temperature (last reading): 68°C — within limits. OPEN WORK ORDERS: WO-2024-1847: Minor seal weep noted 18-December-2024. WO-2024-1901: Suction strainer fouling suspected — schedule cleaning Feb 2025. NOTE: P-101 has shown bearing wear acceleration during summer months (May-August). Root cause analysis WO-2023-0892 attributed to cooling water quality.`,
  },
  {
    id: "mp_p101_4",
    filename: "maintenance_procedure_P101.txt",
    doc_type: "Maintenance Procedure",
    asset_tag: "P-101",
    content: `P-101 SPARE PARTS: Bearing: SKF 6314-2Z (critical spare — minimum 2 units in store). Mechanical Seal: John Crane T21 — CRITICAL: 1 unit in store — REORDER REQUIRED (currently at ZERO STOCK per MNC-2024-02). Gasket Set: VFC-P101-GS-003 (2 sets available). REGULATORY COMPLIANCE: Factory Act 1948 Schedule I (hazardous processes). OISD-116 Section 7: Rotating equipment safety — last audit PASSED Sep-2024. Next statutory inspection due: March-2025.`,
  },
  // ── INCIDENT REPORT IR-2024-047 ──────────────────────────────────────────
  {
    id: "ir_047_0",
    filename: "incident_report_IR2024_047.txt",
    doc_type: "Incident Report",
    asset_tag: "P-103,HE-301,GD-303",
    content: `INCIDENT INVESTIGATION REPORT: IR-2024-047. Date: 07-August-2024. Location: Ammonia Synthesis Loop Area 3, Near P-103 and Heat Exchanger HE-301. Classification: Near-Miss High Potential. At 14:35 IST on 07-August-2024, area gas detector GD-303 alarmed at 45 ppm NH3 (alarm threshold: 25 ppm). Simultaneously, maintenance crew was executing Work Order WO-2024-1102 (mechanical seal replacement on P-103) under Hot Work Permit HWP-2024-089. The combination of elevated NH3 concentration and active hot work in the same zone created a compound hazard requiring immediate evacuation of Area 3.`,
  },
  {
    id: "ir_047_1",
    filename: "incident_report_IR2024_047.txt",
    doc_type: "Incident Report",
    asset_tag: "P-103,HE-301,GD-303",
    content: `IR-2024-047 TIMELINE: 14:20 — WO-2024-1102 commenced. Hot work permit HWP-2024-089 active. 14:30 — GD-303 first reading: 18 ppm NH3 (below alarm threshold, NOT flagged). 14:35 — GD-303 alarm: 45 ppm NH3. Hot work suspended. Area evacuation ordered. 14:42 — Source identified: small flange leak on HE-301 inlet (unrelated to ongoing work order). 14:55 — Area cleared. Gas concentration returned to <5 ppm. 15:10 — All-clear issued.`,
  },
  {
    id: "ir_047_2",
    filename: "incident_report_IR2024_047.txt",
    doc_type: "Incident Report",
    asset_tag: "P-103,HE-301,GD-303",
    content: `IR-2024-047 ROOT CAUSE ANALYSIS: Immediate Cause: HE-301 inlet flange gasket micro-failure causing NH3 release. Contributing Factor 1: No real-time cross-reference between active gas readings and concurrent hot work permits — safety officer was NOT alerted at 18 ppm reading because it was below standalone alarm threshold. Contributing Factor 2: Work Order WO-2024-1102 was issued without checking GD-303 last 48h trend (slight upward drift from 3 ppm to 8 ppm pre-incident). Contributing Factor 3: HE-301 last inspected 14 months ago — overdue by 2 months. CRITICAL LESSON: The failure was the ABSENCE of an intelligence layer to correlate sub-threshold gas readings with concurrent hot work permit activity.`,
  },
  {
    id: "ir_047_3",
    filename: "incident_report_IR2024_047.txt",
    doc_type: "Incident Report",
    asset_tag: "P-103,HE-301,GD-303",
    content: `IR-2024-047 CORRECTIVE ACTIONS: IMMEDIATE: HE-301 flange gasket replaced. Torque verification completed. CLOSED. SHORT-TERM: Inspection frequency for HE-301 increased to 6-monthly. OPEN. SYSTEMIC: Recommend implementing compound risk check before issuing hot work permits — cross-reference gas sensor trends (not just threshold alarms) with active permit zones. OPEN — assigned to digital safety team as CNC-2024-01. Review all permits active within 15m of any sensor showing >50% of alarm threshold. REGULATORY: Near-miss reported to DISH per Factory Act Section 88A — filed 09-August-2024. OISD-116 Clause 12.4 procedure gap identified.`,
  },
  // ── OISD-116 ─────────────────────────────────────────────────────────────
  {
    id: "oisd_0",
    filename: "oisd_116_extract.txt",
    doc_type: "Regulatory Standard",
    asset_tag: "ALL",
    content: `OISD STANDARD 116 — FIRE PREVENTION AND PROTECTION SYSTEM. Section 7 SAFETY IN ROTATING EQUIPMENT: All rotating equipment in hazardous area Zone 1 and Zone 2 must have automatic vibration monitoring per ISO 10816-3. Mechanical seals on pumps handling toxic or flammable media must be inspected at intervals not exceeding 90 days. Any detected leak exceeding 5 drops/minute must trigger a work order within 24 hours (OISD-116 Clause 7.2). H2S maximum 10 ppm (8-hour TWA). IDLH: 100 ppm. Any area reading >50 ppm triggers mandatory evacuation (OISD-116 Clause 7.3).`,
  },
  {
    id: "oisd_1",
    filename: "oisd_116_extract.txt",
    doc_type: "Regulatory Standard",
    asset_tag: "ALL",
    content: `OISD-116 AMMONIA (NH3) ALARM THRESHOLDS: Level 1 Alert: 25 ppm — notify safety officer, review active permits in zone. Level 2 Alarm: 50 ppm — suspend all hot work, prepare for evacuation. Level 3 Emergency: 100 ppm — mandatory evacuation, emergency response activation. Section 12 HOT WORK PERMIT SYSTEM: No hot work permit shall be issued without a gas test conducted within 1 hour. Gas tests must be repeated every 2 hours for continuous work. Hot work permits must not be issued in areas where toxic gas concentration exceeds 25% of LEL or 10 ppm H2S / 25 ppm NH3.`,
  },
  {
    id: "oisd_2",
    filename: "oisd_116_extract.txt",
    doc_type: "Regulatory Standard",
    asset_tag: "ALL",
    content: `OISD-116 Clause 12.4 HOT WORK NEAR HAZARDOUS GAS ZONES: If any gas detector within 15 meters of the hot work zone has recorded readings above 50% of Level 1 Alert threshold in the preceding 4 hours, permit issuance requires additional sign-off from the Plant Safety Officer (not just Shift Supervisor). Clause 12.5: PTW system must maintain a real-time log of all concurrent permits in any defined zone. Section 18 INSPECTION AND TESTING: Heat exchangers in hazardous fluid service must be inspected per ASME PCC-2. Maximum inspection interval: 12 months. Flange connections in toxic service (NH3, H2S) must undergo leak detection survey at intervals not exceeding 6 months.`,
  },
  // ── WORK ORDERS LOG ───────────────────────────────────────────────────────
  {
    id: "wo_0",
    filename: "work_orders_log.txt",
    doc_type: "Work Order Log",
    asset_tag: "P-101,HE-301,GD-303,V-101A",
    content: `WORK ORDER LOG — VFC Area 3 Ammonia Synthesis Loop. WO-2024-1847 | Asset: P-101 | Type: Corrective | Status: OPEN | Priority: MEDIUM | Due: 15-Feb-2025. Description: Minor seal weep noted during routine inspection — 3-4 drops/min (below 5 drop/min OISD threshold but TRENDING UP). Note: Seal spares inventory — John Crane T21 at ZERO STOCK. REORDER TRIGGERED. WO-2024-1901 | Asset: P-101 | Type: Predictive | Status: OPEN | Priority: MEDIUM | Due: 10-Feb-2025. Description: Suction strainer suspected fouling — differential pressure 0.8 bar (normal: 0.3-0.5 bar). Trending analysis shows 30% increase in dP over past 6 weeks.`,
  },
  {
    id: "wo_1",
    filename: "work_orders_log.txt",
    doc_type: "Work Order Log",
    asset_tag: "P-101,HE-301,GD-303,V-101A",
    content: `WO-2024-1801 | Asset: HE-301 | Type: Corrective | Status: OPEN | Priority: HIGH | Due: 05-Jan-2025. Description: Flange gasket replacement following IR-2024-047 incident. Note: Interim monthly leak survey ordered. WO-2024-1955 | Asset: HE-301 | Type: Inspection | Status: OPEN | Priority: HIGH | Due: 15-Jan-2025. Description: Wall thickness measurement — requires confined space entry permit + gas clearance certificate. Contractor: Bharat NDT Services — site induction due (2 of 4 technicians INDUCTION OVERDUE per MNC-2024-03). WO-2024-1967 | Asset: V-101A | Priority: LOW | Due: 28-Feb-2025. CRITICAL NOTE: V-101A is P-101 isolation valve. Simultaneous maintenance of V-101A and P-101 must NOT occur — creates single-point isolation failure risk (HAZ-002).`,
  },
  {
    id: "wo_2",
    filename: "work_orders_log.txt",
    doc_type: "Work Order Log",
    asset_tag: "P-101,HE-301,GD-303,V-101A",
    content: `ACTIVE PERMITS (last 30 days): HWP-2024-118: Hot Work — Flange bolt replacement HE-301 | ACTIVE since 20-Dec-2024. EWP-2024-201: Electrical Work — MCC-3 panel maintenance | ACTIVE since 18-Dec-2024. GD-303 CALIBRATION: WO-2024-1923 | CLOSED 15-Dec-2024. Calibration PASS — zero drift 0.3 ppm (limit: 1 ppm). RISK NOTICE: HWP-2024-118 is active on HE-301 in Area 3 where incident IR-2024-047 occurred. Combined with P-101 seal weep (WO-2024-1847) and zero seal spare stock — this constitutes a compound hazard condition (HAZ-001, HAZ-003).`,
  },
  // ── COMPLIANCE AUDIT ─────────────────────────────────────────────────────
  {
    id: "audit_0",
    filename: "regulatory_compliance_audit.txt",
    doc_type: "Compliance Audit",
    asset_tag: "ALL",
    content: `SAFETY AND REGULATORY COMPLIANCE AUDIT — VFC-AUDIT-2024-Q3. Audit Period: July-September 2024. Overall Compliance Score: 76% (Target: 90%). Critical Non-Conformances: 2. Major Non-Conformances: 5. CNC-2024-01: OISD-116 Section 12.4 — No PTW-sensor cross-reference mechanism. Investigation of IR-2024-047 revealed PTW system has no mechanism to cross-reference active permits with real-time gas sensor data. Risk: HIGH. Target: 31-March-2025. Status: OPEN. CNC-2024-02: Factory Act 1948 Section 41B — HAZOP documentation last updated 2019. Process modifications in 2022 (HE-301 circuit revamp) not reflected. Target: 30-June-2025. Status: OPEN.`,
  },
  {
    id: "audit_1",
    filename: "regulatory_compliance_audit.txt",
    doc_type: "Compliance Audit",
    asset_tag: "ALL",
    content: `COMPLIANCE AUDIT MAJOR NON-CONFORMANCES: MNC-2024-02: P-101 mechanical seal spare (John Crane T21) at ZERO STOCK. OISD best practice requires minimum 1 unit on hand for critical rotating equipment. Status: OPEN — purchase order raised, ETA 6 weeks. MNC-2024-03: Bharat NDT Services — 2 of 4 technicians lack current site induction. Cannot perform confined space work until resolved. Status: OPEN. MNC-2024-04: Last NH3 release drill in Area 3 was 18 months ago. Factory Act requires annual emergency drill for hazardous zones. Status: OPEN. COMPLIANCE SCORES: OISD-116: 84% | Factory Act 1948: 73% | OISD-105: 67% | DGMS: 80% | OVERALL: 76%.`,
  },
];

// ── SIMPLE KEYWORD-BASED RETRIEVAL (no vector DB needed on Vercel) ──────────
export function retrieve(query: string, topK = 6): Array<DocChunk & { score: number }> {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const scored = DOCUMENT_CHUNKS.map(chunk => {
    const text = chunk.content.toLowerCase();
    let score = 0;
    for (const word of qWords) {
      // Count occurrences
      const matches = (text.match(new RegExp(word, "g")) || []).length;
      score += matches;
      // Bonus for asset tag match
      if (chunk.asset_tag.toLowerCase().includes(word)) score += 3;
      // Bonus for doc_type match
      if (chunk.doc_type.toLowerCase().includes(word)) score += 2;
    }
    return { ...chunk, score };
  });

  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => ({ ...c, score: Math.min(c.score / 20, 1) }));
}
