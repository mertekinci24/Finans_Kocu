# logic_specs_v2.md - Hierarchical Scoring v6.1 (Deterministic Refinement)

This document defines the production-grade implementation for the FinansKoçu financial logic engine v6.1. It is a technical specification for developers and AI context reading.

---

## Technical Definitions

### Weighted Net Worth (WNW)
To measure liquidity quality, assets are weighted by their liquidation ease:
- **Liquid Assets (Cash / Bank / FX / Gold):** 1.0 (for WNW calculation)
- **Ticari Stok (Liquid Stock):** 0.5
- **Gayrimenkul / Araç:** 0.2

`WNW = Σ(Asset_i * Weight_i) - TotalDebt`

### Nakit Tamponu (NT)
Measures survival duration including near-liquid assets with haircuts.
`NT = (Cash + (FX * 0.9) + (Gold * 0.9)) / MRE`

### Liquidity Stress
Measures the proportion of liquid assets in the total portfolio.
`LiquidityStress = LiquidAssets / TotalAssets`

### MonthlyRequiredExpenses (MRE)
`MonthlyRequiredExpenses = FixedMandatory + VariableEssential + DebtPayments`
*   **FixedMandatory:** Rent, Utilities, Insurance, Subscriptions.
    - **Proactive Fallback:** If current month is empty for a category, use `Σ(last_3_mo) / 3` for that specific category.
*   **VariableEssential (Rolling 3-Mo Avg):** Food, Transport, and Market categories.
*   **DebtPayments:** Total mandatory installment burden + credit card minimum payments.

---

## Layer 0: Solvency Guard (Technical Floor)
**The Ultimate Floor:** Detects negative equity after liquidity weighting.
- **Trigger:** `WNW < 0`
- **Effect:** Sub-layer score is locked to the **0–14 (Kriz)** range.

---

## Layer 1: Override Engine (Liquidity Stress Detection)
**Critical Priority:** Supersedes lower layers unless suppressed by wealth.

### Trigger A: Cash Blockage & Intra-month Risk
- **DisposableCash** = `Income + AvailableCash - MRE`
- **Intra-month Risk:** Measures if the daily balance dips below zero at any point in the next 30 days (due to payment vs. salary timing mismatch).
- **Logic:**
    - **IF** `(DisposableCash < 0 OR minBalance < 0)` **AND** `(NT < 1)`:
        - **Status:** Kritik High Risk (Score 15–25)
        - **Reason:** Immediate liquidity failure or intra-month zero-crossing.
    - **ELSE IF** `(DisposableCash < 0 OR minBalance < 0)` **AND** `(NT >= 1)`:
        - **Status:** "Cash Flow Warning" (No override trigger)
        - **Effect:** Proceed to Layer 3.

### Trigger C: Persistent Delinquency
- **Condition:** Overdue debt >= 30 days.
- **Score:** <= 24 (Kritik)

---

## Layer 2: Truth Engine (Data Confidence)
`TruthScore = (Freshness × 0.5) + (Consistency × 0.5) (0-100)`

**NOTE:** TruthScore is currently applied as a full multiplier. This may significantly reduce scores for low data quality. Consider future soft-scaling if needed.

---

## Layer 3: Base Score Engine (Refining v6.1)
The score calculation follows continuous mathematical curves with additive penalties.

### 1. VC_adj (Düzeltilmiş Çarpan / Dynamic Absorption)
`VC = min(1.0, log10(max(1, WNW / MRE)) / 3)`
`VC_adj = VC * (1 - e^(-NT/12))`

### 2. SmoothPenalty (Dynamic Risk Curve)
`SmoothPenalty = (30 * e^(-NT)) * (1 - VC_adj)`

### 3. Liquidity Penalty
Penalizes low liquid asset proportion with a smooth continuous curve.
- **IF** `LiquidityStress >= 0.3`:
    - `LiquidityPenalty = 0`
- **ELSE**:
    - `LiquidityPenalty = 15 * (1 - LiquidityStress / 0.3)`

### 4. Trend Penalty
Penalizes the speed of deterioration in the cash buffer.
- `DeltaNT = NT_current - NT_previous`
- **IF** `DeltaNT < 0`:
    - `TrendPenalty = min(20, abs(DeltaNT) * 5)`
- **ELSE**: `TrendPenalty = 0`

### 5. Death Pit Score
Accumulative penalty for high-risk behaviors.
- `DeathPitScore = 0`
- **IF** (Last 3 Mo FCF Negative): `DeathPitScore += 5`
- **IF** `(NT < 0.5)`: `DeathPitScore += 10`
- **IF** `(MRE > 0.8 * Income)`: `DeathPitScore += 5`

### Final Base Score
`BaseScore = RawPerformance - SmoothPenalty - TrendPenalty - LiquidityPenalty - DeathPitScore`

---

## Layer 4: Anchor Engine (Solvency Protection)
Provides a smooth score boost based on the Sigmoid function.

**Anchor Boost Calculation:**
- **IF** `TotalDebt == 0`:
    - `AnchorBoost = 10 * sigmoid(log10(max(1, WNW / MRE)) - 2)`
- **ELSE**:
    - `AnchorBoost = 10 * sigmoid((WNW / TotalDebt) - 2)`

`IntermediateScore = max(BaseScore, 50 + AnchorBoost)`

*Note: `sigmoid(x) = 1 / (1 + e^(-x))`*

---

## Layer 5: Future / Scenario Engine
Forecast Horizon: 30 days (Precision) | 6 months (Standard) | 12 months (Projection).
- **Precision Horizon (30d):** Uses specific `statementDay`, `paymentDay`, and `firstPaymentDate` (Due Day) for exact day-to-day cash flow modeling.

---

## Execution Logic (Final Score Flow)
```text
If Layer0_Triggered (WNW < 0):
    FinalScore = SolvencyFloor (0-14, Kriz)
Else If Layer1_Triggered (Cash Blockage AND NT < 1):
    FinalScore = KritikScore (15-25, Kritik)
Else:
    BaseScore = CalculateLayer3()
    IntermediateScore = ApplyAnchor(BaseScore)
    FinalScore = IntermediateScore

// FINAL STEP: Quality Scaling
FinalScore = FinalScore * (TruthScore / 100)

Return FinalScore (0-100)
```
