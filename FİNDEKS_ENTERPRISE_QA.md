# FİNDEKS ENTERPRISE QA MATRIX

## 1. Objective
The primary objective of this QA Matrix is to ensure the Findeks Analysis and AI Assistant Bridge operates deterministically. The system must read different Findeks PDF styles dynamically using semantic anchor-based proximity extraction. It must not hallucinate missing fields, and it must reliably distinguish between explicit zero values and missing data across varying report layouts.

## 2. Document Types
The extraction pipeline and UI must be tested against the following document variations:
1. **Findeks credit score only PDF:** Minimal report lacking detailed product or debt metrics.
2. **Full individual risk report PDF:** Comprehensive report with multiple tables, limits, and debt histories.
3. **Commercial risk report PDF:** Business-oriented risk profiles.
4. **Bank-exported credit summary PDF:** Third-party layout summarizing Findeks data.
5. **Scanned PDF without text layer:** Image-based document requiring external OCR capabilities (or graceful failure).
6. **Non-Findeks unrelated PDF:** Invalid document (e.g., utility bill).
7. **Corrupted PDF:** Unreadable or malformed file structure.

## 3. Extraction Acceptance Criteria
For each data field, the parser must adhere to the following strict confidence rules:

*   **creditScore:** 
    *   Expected Status: Numeric (1-1900)
    *   Confidence Expectations: High. Must use distance-based priority to ignore page numbers.
    *   When null is required: Unreadable or missing score.
    *   When zero is allowed: Never allowed.

*   **reportDate:** 
    *   Expected Status: Date string or timestamp
    *   Confidence Expectations: Exact match for valid DD.MM.YYYY format.
    *   When null is required: Missing from document.
    *   When zero is allowed: Never allowed.

*   **referenceCode:** 
    *   Expected Status: Alphanumeric string
    *   Confidence Expectations: Must match specific Findeks reference format.
    *   When null is required: Missing from document.
    *   When zero is allowed: Never allowed.

*   **limitUsageRatio:** 
    *   Expected Status: Numeric (0-100)
    *   Confidence Expectations: Must use directional bias to avoid confusing with score components.
    *   When null is required: No limit usage indicator found.
    *   When zero is allowed: Only if explicitly "%0" or "0" next to anchor.

*   **delayMonths:** 
    *   Expected Status: Numeric (0+)
    *   Confidence Expectations: Must match specific delay patterns (e.g., "gecikmiş ay").
    *   When null is required: Section missing.
    *   When zero is allowed: Explicitly stated no delays ("0 ay").

*   **bankAccounts:** 
    *   Expected Status: Numeric (0+)
    *   Confidence Expectations: Deep scan with regex targeting exact column/line metrics.
    *   When null is required: Entire account section is absent.
    *   When zero is allowed: Only if explicitly "0".

*   **creditCards:** 
    *   Expected Status: Numeric (0+)
    *   Confidence Expectations: Deep scan bypassing general % weights.
    *   When null is required: Section absent.
    *   When zero is allowed: Only if explicitly "0".

*   **activeDebts:** 
    *   Expected Status: Numeric (0+)
    *   Confidence Expectations: High accuracy required.
    *   When null is required: Section absent.
    *   When zero is allowed: Explicitly "0" active debts.

*   **scoreComponents:** 
    *   Expected Status: Array of numbers or object mapping components to weights.
    *   Confidence Expectations: Negative lookahead required to avoid mixing with `limitUsageRatio`.
    *   When null is required: Section missing.
    *   When zero is allowed: A component explicitly has 0 weight.

## 4. Critical Rule
**0 is a valid value only if explicitly stated in the document. Missing data must be null.**

## 5. Sample PDF Expected Result
For the user-provided sample PDF (1636 Score):

*   **documentType** = findeks_credit_score_only
*   **creditScore** = 1636
*   **reportDate** = 24.03.2026
*   **limitUsageRatio** = null
*   **bankAccounts** = null
*   **creditCards** = null
*   **activeDebts** = null
*   **scoreComponents** = 45 / 32 / 18 / 5

## 6. UI Acceptance Criteria
*   Show **"Bulunamadı"** instead of 0 for any missing metric.
*   Show evidence/reason when available (e.g., "Analiz penceresinde bulunamadı").
*   Ensure **score components** are visually separate from limit usage.
*   Display a warning when the PDF is score-only (e.g., "Bu rapor sadece özet skor içermektedir, detay veriler yoktur").

## 7. AI Bridge Acceptance Criteria
The Assistant payload must include:
*   **full evidence object** detailing how parsing succeeded/failed.
*   **missingFields** explicit array of keys that resolved to null.
*   **parserVersion** to track OCR updates.
*   **documentType** inferred classification.
*   **rawTextPreview** limited text snippet for debugging context.
*   **score components** array if available.
*   **no fake zeros**: Missing fields must be null/undefined, absolutely no 0 padding.

## 8. Regression Tests
*   **%45 component must not become limitUsageRatio** under any circumstances.
*   **-45% must never appear**; negative extraction is an automatic failure.
*   AI must **not say "limit kullanımınız %0"** if the field is missing.
*   AI must **say "bu PDF'te limit kullanım oranı bulunmuyor"** (or dynamically omit advice on it) when `limitUsageRatio` is null.
