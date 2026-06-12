"""Controlled NCLEX subcategory taxonomy — mirrors lib/subcategories.ts."""

from __future__ import annotations

SUBCATEGORIES: dict[str, list[str]] = {
    "Management of Care": [
        "General",
        "Delegation and Supervision",
        "Prioritization",
        "Legal and Ethical Practice",
        "Advance Directives",
        "Case Management",
        "Continuity of Care",
        "Informed Consent",
    ],
    "Safety and Infection Control": [
        "General",
        "Standard Precautions and PPE",
        "Isolation Precautions",
        "Infection Prevention",
        "Accident and Injury Prevention",
        "Emergency Response",
        "Medical and Surgical Asepsis",
    ],
    "Pharmacological and Parenteral Therapies": [
        "General",
        "Cardiac Glycosides",
        "Diuretics",
        "ACE Inhibitors",
        "Antihypertensives",
        "Calcium Channel Blockers",
        "Anticoagulants and Thrombolytics",
        "Antibiotics",
        "Pain Management and Opioids",
        "Insulin and Antidiabetics",
        "Psychiatric Medications",
        "IV Therapy and Fluids",
        "Dosage Calculation",
        "Adverse Effects and Interactions",
    ],
    "Physiological Adaptation": [
        "General",
        "Cardiac Disorders",
        "Respiratory Disorders",
        "Renal and Urinary Disorders",
        "Neurological Disorders",
        "Endocrine Disorders",
        "Gastrointestinal Disorders",
        "Musculoskeletal Disorders",
        "Hematologic Disorders",
        "Fluid and Electrolyte Imbalances",
        "Shock and Emergencies",
        "Postoperative Care",
    ],
    "Reduction of Risk Potential": [
        "General",
        "Lab Values",
        "Diagnostic Tests",
        "Vital Signs Monitoring",
        "Surgical Risk and Complications",
        "Therapeutic Procedures",
    ],
    "Basic Care and Comfort": [
        "General",
        "Nutrition and Diet",
        "Mobility and Positioning",
        "Hygiene and Personal Care",
        "Elimination",
        "Rest and Sleep",
        "Non-Pharmacological Comfort",
    ],
    "Health Promotion and Maintenance": [
        "General",
        "Growth and Development",
        "Maternal and Newborn Care",
        "Immunizations",
        "Health Screening",
        "Lifestyle and Disease Prevention",
    ],
    "Psychosocial Integrity": [
        "General",
        "Therapeutic Communication",
        "Coping Mechanisms",
        "Mental Health Disorders",
        "Substance Use Disorders",
        "Crisis Intervention",
        "Grief and Loss",
        "Abuse and Neglect",
    ],
}


def normalize_subcategory(category: str, raw: str | None) -> str:
    subs = SUBCATEGORIES.get(category)
    if not subs:
        return raw or "General"
    if not raw:
        return "General"
    lower = raw.lower()
    for sub in subs:
        if sub.lower() == lower:
            return sub
    for sub in subs:
        sl, rl = sub.lower(), lower
        if sl in rl or rl in sl:
            return sub
    return "General"


def format_subcategory_prompt() -> str:
    blocks = []
    for cat, subs in SUBCATEGORIES.items():
        lines = "\n".join(f"  - {s}" for s in subs)
        blocks.append(f"{cat}:\n{lines}")
    return "\n\n".join(blocks)
