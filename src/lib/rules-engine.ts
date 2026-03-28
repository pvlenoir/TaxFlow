// ═══════════════════════════════════════════════════════════════════════════
// TAXFLOW AI v2 — Rules Engine
// Compound insight support. Section 24 awareness. Advisor questions.
// ═══════════════════════════════════════════════════════════════════════════

import type { Property, PropertyMetrics, PortfolioMetrics, Insight } from "../types";

const DISC = "This is for educational and informational purposes only and should not be considered tax, legal, or financial advice.";
const TH = { EXP_H: 45, EXP_C: 60, INT_H: 35, INT_C: 50, LTV_H: 75, LTV_C: 85, YIELD_L: 4 };

let _n = 0;
const id = () => `ins-${++_n}`;
const £ = (v: number) => `£${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;

export function generateAllInsights(
  props: Property[],
  mets: PropertyMetrics[],
  port: PortfolioMetrics
): Insight[] {
  _n = 0;
  const ins: Insight[] = [];

  // ── SINGLE-METRIC RULES (per property) ──
  for (const m of mets) {
    // Expense ratio
    if (m.rentalIncome > 0 && m.expenseRatio >= TH.EXP_C) {
      const ex = m.totalOperatingCosts - m.rentalIncome * 0.35;
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Very High Operating Cost Ratio", severity: "critical", category: "expenses",
        explanation: `Operating costs on ${m.propertyName} consume ${pct(m.expenseRatio)} of rental income. The typical range for managed residential property is 25–40%.`,
        whyItMatters: "A high cost ratio directly reduces the income available to cover finance costs and generate returns. This may indicate costs that could be renegotiated, or spending that a specialist could help reclassify.",
        advisorQuestion: "Can you review my expense breakdown for this property and identify any items that may be above market rate or eligible for different tax treatment?",
        dataPoints: [`Operating costs: ${£(m.totalOperatingCosts)}`, `Rental income: ${£(m.rentalIncome)}`, `Ratio: ${pct(m.expenseRatio)}`],
        estimatedImpact: ex > 0 ? `If costs were at 35%, the difference would be ~${£(ex)}/yr` : null,
        isCompound: false, disclaimer: DISC,
      });
    } else if (m.rentalIncome > 0 && m.expenseRatio >= TH.EXP_H) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Elevated Operating Cost Ratio", severity: "warning", category: "expenses",
        explanation: `Costs are ${pct(m.expenseRatio)} of income on ${m.propertyName}, above the typical 25–40% range.`,
        whyItMatters: "Line-by-line review may reveal costs higher than market norms or items that could be categorised differently.",
        advisorQuestion: "Are all my deductible expenses being claimed correctly, and are any costs above what you'd typically see?",
        dataPoints: [`Operating costs: ${£(m.totalOperatingCosts)}`, `Ratio: ${pct(m.expenseRatio)}`],
        estimatedImpact: null, isCompound: false, disclaimer: DISC,
      });
    }

    // Interest burden (standalone)
    if (m.rentalIncome > 0 && m.interestBurdenRatio >= TH.INT_C) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Finance Costs Dominating Income", severity: "critical", category: "finance",
        explanation: `Mortgage interest on ${m.propertyName} consumes ${pct(m.interestBurdenRatio)} of rental income.`,
        whyItMatters: "When more than half of income goes to interest, even small changes in rates or rent levels can tip the property into negative territory.",
        advisorQuestion: "Would refinancing or partial repayment improve my position on this property, considering early repayment charges?",
        dataPoints: [`Interest: ${£(m.financeCosts)}/yr`, `Income: ${£(m.rentalIncome)}/yr`, `Burden: ${pct(m.interestBurdenRatio)}`],
        estimatedImpact: `${£(m.financeCosts)}/yr in interest`, isCompound: false, disclaimer: DISC,
      });
    }

    // High LTV
    if (m.ltv >= TH.LTV_C) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Very High Leverage", severity: "critical", category: "risk",
        explanation: `LTV on ${m.propertyName} is ${pct(m.ltv, 0)}, well above typical buy-to-let lending thresholds.`,
        whyItMatters: "High leverage increases exposure to property value declines and may limit future refinancing options.",
        advisorQuestion: "What is my exposure if property values fell by 10–15%, and would partial repayment improve my lending terms?",
        dataPoints: [`LTV: ${pct(m.ltv, 0)}`, `Mortgage: ${£(m.financeCosts > 0 ? (m.financeCosts / (m.interestBurdenRatio / 100) * (m.ltv / 100)) : 0)}`],
        estimatedImpact: null, isCompound: false, disclaimer: DISC,
      });
    } else if (m.ltv >= TH.LTV_H) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Elevated Leverage", severity: "warning", category: "risk",
        explanation: `LTV on ${m.propertyName} is ${pct(m.ltv, 0)}, above the 75% threshold typical for BTL lending.`,
        whyItMatters: "This may result in less favourable refinancing terms and reduces your equity buffer.",
        advisorQuestion: null,
        dataPoints: [`LTV: ${pct(m.ltv, 0)}`],
        estimatedImpact: null, isCompound: false, disclaimer: DISC,
      });
    }

    // Section 24 cost for personal properties
    if (m.section24 && m.section24.section24CostAt40 > 500) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Section 24 May Be Increasing Your Tax Cost", severity: "warning", category: "structure",
        explanation: `${m.propertyName} is held personally. Under Section 24, mortgage interest (${£(m.section24.mortgageInterest)}/yr) can no longer be deducted from rental income. Instead, you receive a 20% tax credit. For a higher-rate taxpayer, this creates an additional illustrative cost of ~${£(m.section24.section24CostAt40)}/yr compared to the pre-2017 rules.`,
        whyItMatters: "Section 24 is the single largest tax change affecting UK personal landlords. Many landlords don't realise they are paying more tax than expected because interest is no longer fully deductible.",
        advisorQuestion: "Given my tax band, what is my actual Section 24 position across all properties? Would incorporation reduce this cost?",
        dataPoints: [
          `Rental profit (before credit): ${£(m.section24.rentalProfitBeforeCredit)}`,
          `Mortgage interest: ${£(m.section24.mortgageInterest)}`,
          `Basic-rate credit: ${£(m.section24.basicRateTaxCredit)}`,
          `Illustrative extra cost at 40%: ${£(m.section24.section24CostAt40)}`,
        ],
        estimatedImpact: `~${£(m.section24.section24CostAt40)}/yr additional tax cost at higher rate`,
        isCompound: false, disclaimer: DISC,
      });
    }

    // Strong performance
    if (m.grossYield >= 7 && m.expenseRatio < 35 && !m.isNegativeCashFlow) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Strong Operating Performance", severity: "positive", category: "profitability",
        explanation: `${m.propertyName} achieves ${pct(m.grossYield, 2)} gross yield with controlled costs (${pct(m.expenseRatio)} ratio) and positive cash flow.`,
        whyItMatters: "This property is performing well on key operational metrics, providing good income resilience.",
        advisorQuestion: null,
        dataPoints: [`Yield: ${pct(m.grossYield, 2)}`, `Expense ratio: ${pct(m.expenseRatio)}`, `Cash flow: ${£(m.estimatedCashFlowBeforeTax)}`],
        estimatedImpact: null, isCompound: false, disclaimer: DISC,
      });
    }
  }

  // ── COMPOUND RULES (multi-condition, per property) ──

  for (const m of mets) {
    const prop = props.find(p => p.id === m.propertyId);
    if (!prop) continue;

    // COMPOUND: Personal + high interest + strong rent = Section 24 squeeze
    if (
      m.ownershipType === "personal" &&
      m.interestBurdenRatio >= 30 &&
      m.rentalIncome > 8000 &&
      m.section24 &&
      m.section24.section24CostAt40 > 200
    ) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Personal Ownership + High Interest = Section 24 Squeeze", severity: "critical", category: "compound",
        explanation: `${m.propertyName} combines personal ownership, significant mortgage interest (${pct(m.interestBurdenRatio)} of rent), and decent rental income (${£(m.rentalIncome)}/yr). Under Section 24, you may be taxed on rental profit of ${£(m.section24.rentalProfitBeforeCredit)} while only receiving a 20% credit on ${£(m.section24.mortgageInterest)} interest. If you are a higher-rate taxpayer, you could be paying tax on income that is effectively absorbed by mortgage payments.`,
        whyItMatters: "This is the most common pattern where UK landlords discover they are paying substantially more tax than expected. The combination of personal ownership, significant leverage, and reasonable rents creates the worst Section 24 outcomes.",
        advisorQuestion: "Given the Section 24 restriction on this property, would it be beneficial to explore incorporation, and what would the SDLT and CGT implications be?",
        dataPoints: [
          `Ownership: Personal`, `Interest burden: ${pct(m.interestBurdenRatio)}`,
          `Rental income: ${£(m.rentalIncome)}/yr`, `Interest: ${£(m.financeCosts)}/yr`,
          `Illustrative Section 24 cost: ${£(m.section24.section24CostAt40)}/yr at 40%`,
        ],
        estimatedImpact: `~${£(m.section24.section24CostAt40)}/yr potential additional cost at higher rate`,
        isCompound: true, disclaimer: DISC,
      });
    }

    // COMPOUND: Negative cash flow + high expenses + low yield
    if (m.isNegativeCashFlow && m.expenseRatio >= 40 && m.grossYield < 5) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "Cash Drain: Low Yield + High Costs + Negative Cash Flow", severity: "critical", category: "compound",
        explanation: `${m.propertyName} is losing ${£(Math.abs(m.estimatedCashFlowBeforeTax))}/yr in cash flow, while operating costs are elevated at ${pct(m.expenseRatio)} and gross yield is only ${pct(m.grossYield, 2)}. Multiple factors are working against this property simultaneously.`,
        whyItMatters: "When low yield, high costs, and negative cash flow coincide, the property may only be justified by capital growth expectations. This combination creates ongoing financial drain and may warrant a fundamental review of whether to hold, restructure, or dispose.",
        advisorQuestion: "Given the negative cash flow, low yield, and cost profile, what are the tax implications if I were to consider disposing of this property versus restructuring?",
        dataPoints: [
          `Cash flow: ${£(m.estimatedCashFlowBeforeTax)}/yr`, `Expense ratio: ${pct(m.expenseRatio)}`,
          `Gross yield: ${pct(m.grossYield, 2)}`, `Operating surplus: ${£(m.operatingSurplus)}`,
        ],
        estimatedImpact: `${£(Math.abs(m.estimatedCashFlowBeforeTax))}/yr cash deficit`,
        isCompound: true, disclaimer: DISC,
      });
    }

    // COMPOUND: High leverage + weak cash flow
    if (m.ltv >= 70 && m.isNegativeCashFlow) {
      ins.push({
        id: id(), propertyId: m.propertyId, propertyName: m.propertyName,
        title: "High Leverage Combined With Negative Cash Flow", severity: "critical", category: "compound",
        explanation: `${m.propertyName} has LTV of ${pct(m.ltv, 0)} and is generating negative cash flow of ${£(m.estimatedCashFlowBeforeTax)}/yr. High debt levels combined with cash outflow creates dual risk: you're funding a shortfall while being exposed to value and rate movements.`,
        whyItMatters: "This combination means you are subsidising the property from other income while having limited equity buffer. A rate increase or value decline could create a situation where both cash flow and equity position deteriorate simultaneously.",
        advisorQuestion: "What is my risk exposure if rates increase by a further 1–2% on this property, and would partial capital repayment be advisable?",
        dataPoints: [`LTV: ${pct(m.ltv, 0)}`, `Cash flow: ${£(m.estimatedCashFlowBeforeTax)}/yr`],
        estimatedImpact: null, isCompound: true, disclaimer: DISC,
      });
    }
  }

  // ── PORTFOLIO-LEVEL RULES ──

  // Concentration risk
  if (props.length >= 2 && port.totalRentalIncome > 0) {
    for (const m of mets) {
      const share = (m.rentalIncome / port.totalRentalIncome) * 100;
      if (share >= 50) {
        ins.push({
          id: id(), propertyId: null, propertyName: null,
          title: "Portfolio Concentration Risk", severity: "warning", category: "concentration",
          explanation: `${m.propertyName} generates ${pct(share, 0)} of total portfolio income (${£(m.rentalIncome)} of ${£(port.totalRentalIncome)}).`,
          whyItMatters: "Income heavily dependent on one asset. Extended void periods or issues with this property would significantly affect your entire portfolio cash flow.",
          advisorQuestion: "Should I consider diversification strategies to reduce single-asset dependency?",
          dataPoints: [`${m.propertyName}: ${pct(share, 0)} of income`, `Total income: ${£(port.totalRentalIncome)}`],
          estimatedImpact: `${£(m.rentalIncome)}/yr at risk from single-asset dependency`,
          isCompound: false, disclaimer: DISC,
        });
        break;
      }
    }
  }

  // COMPOUND PORTFOLIO: One weak property dragging the portfolio
  const weakest = mets.filter(m => m.isNegativeCashFlow);
  if (weakest.length > 0 && weakest.length < mets.length) {
    const totalDrag = weakest.reduce((s, m) => s + m.estimatedCashFlowBeforeTax, 0);
    const strongCF = mets.filter(m => !m.isNegativeCashFlow).reduce((s, m) => s + m.estimatedCashFlowBeforeTax, 0);
    if (Math.abs(totalDrag) > strongCF * 0.3) {
      ins.push({
        id: id(), propertyId: null, propertyName: null,
        title: "Underperforming Properties Dragging Portfolio", severity: "warning", category: "compound",
        explanation: `${weakest.length} ${weakest.length === 1 ? "property is" : "properties are"} generating negative cash flow totalling ${£(totalDrag)}/yr (${weakest.map(w => w.propertyName).join(", ")}). This is absorbing ${pct(Math.abs(totalDrag) / strongCF * 100, 0)} of the cash generated by your profitable properties.`,
        whyItMatters: "When weak properties consume a significant share of your portfolio's positive cash flow, the overall portfolio becomes fragile. A single additional void or cost increase could push the whole portfolio into negative territory.",
        advisorQuestion: "Should I review the weakest properties for restructuring, refinancing, or potential disposal to protect overall portfolio health?",
        dataPoints: weakest.map(w => `${w.propertyName}: ${£(w.estimatedCashFlowBeforeTax)}/yr`),
        estimatedImpact: `${£(Math.abs(totalDrag))}/yr net drag on portfolio`,
        isCompound: true, disclaimer: DISC,
      });
    }
  }

  // Mixed ownership
  if (port.personalCount > 0 && (port.companyCount > 0 || port.spvCount > 0)) {
    ins.push({
      id: id(), propertyId: null, propertyName: null,
      title: "Mixed Ownership Structures", severity: "info", category: "structure",
      explanation: `Your portfolio includes ${port.personalCount} personally-held and ${port.companyCount + port.spvCount} company/SPV-held properties. These are taxed under different regimes.`,
      whyItMatters: "Mixed structures create complexity in how income, expenses, and losses interact. The tax treatment differs significantly — personal properties face Section 24 restrictions while company properties allow full interest deduction but face corporation tax and extraction costs.",
      advisorQuestion: "Is my current ownership mix optimal, or would consolidating into one structure type reduce overall tax cost?",
      dataPoints: [`Personal: ${port.personalCount}`, `Company/SPV: ${port.companyCount + port.spvCount}`],
      estimatedImpact: null, isCompound: false, disclaimer: DISC,
    });
  }

  // Sort: compound criticals first, then by severity
  const sevOrd: Record<string, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  ins.sort((a, b) => {
    if (a.isCompound !== b.isCompound) return a.isCompound ? -1 : 1;
    return (sevOrd[a.severity] ?? 9) - (sevOrd[b.severity] ?? 9);
  });

  return ins;
}
