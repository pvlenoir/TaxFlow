// ═══════════════════════════════════════════════════════════════════════════
// TAXFLOW AI v2 — Calculation Engine
// Section 24-aware. Ownership-specific tax views. Safe naming.
// ═══════════════════════════════════════════════════════════════════════════

import type { Property, PropertyMetrics, PortfolioMetrics } from "../types";

const BASIC_RATE = 0.20;
const HIGHER_RATE = 0.40;
const CORP_TAX_RATE = 0.25;

export function computePropertyMetrics(p: Property): PropertyMetrics {
  const rentalIncome = p.annualGrossRent;
  const totalOperatingCosts =
    p.annualOperatingExpenses + p.managementFees + p.voidAllowance + p.otherDeductibleCosts;
  const financeCosts = p.annualMortgageInterest;
  const operatingSurplus = rentalIncome - totalOperatingCosts;
  const estimatedCashFlowBeforeTax =
    rentalIncome - totalOperatingCosts - financeCosts - p.annualPrincipalRepayment;
  const cv = p.estimatedCurrentValue || p.purchasePrice || 1;

  // ── SECTION 24 VIEW (personal properties only) ──
  let section24 = null;
  if (p.ownershipType === "personal") {
    // Under Section 24: interest is NOT deductible from rental income
    // Instead, landlord gets a basic-rate (20%) tax credit on interest
    const rentalProfitBeforeCredit = rentalIncome - totalOperatingCosts; // NO interest deduction
    const basicRateTaxCredit = financeCosts * BASIC_RATE;
    const illustrativeTaxAt20 = Math.max(0, rentalProfitBeforeCredit * BASIC_RATE - basicRateTaxCredit);
    const illustrativeTaxAt40 = Math.max(0, rentalProfitBeforeCredit * HIGHER_RATE - basicRateTaxCredit);
    // Section 24 cost: difference between old-style (full deduction at 40%) and new-style
    const oldStyleTaxAt40 = Math.max(0, (rentalProfitBeforeCredit - financeCosts) * HIGHER_RATE);
    const section24CostAt40 = illustrativeTaxAt40 - oldStyleTaxAt40;
    section24 = {
      rentalProfitBeforeCredit,
      mortgageInterest: financeCosts,
      basicRateTaxCredit,
      illustrativeTaxAt20,
      illustrativeTaxAt40,
      section24CostAt40,
    };
  }

  // ── COMPANY VIEW (company/SPV only) ──
  let companyProfitProxy = null;
  if (p.ownershipType === "company" || p.ownershipType === "spv") {
    const profitBeforeTax = rentalIncome - totalOperatingCosts - financeCosts;
    companyProfitProxy = {
      profitBeforeTax,
      illustrativeCorpTax: Math.max(0, profitBeforeTax * CORP_TAX_RATE),
    };
  }

  return {
    propertyId: p.id,
    propertyName: p.name || "Unnamed",
    ownershipType: p.ownershipType,
    rentalIncome,
    totalOperatingCosts,
    financeCosts,
    operatingSurplus,
    estimatedCashFlowBeforeTax,
    section24,
    companyProfitProxy,
    expenseRatio: rentalIncome > 0 ? (totalOperatingCosts / rentalIncome) * 100 : 0,
    interestBurdenRatio: rentalIncome > 0 ? (financeCosts / rentalIncome) * 100 : 0,
    grossYield: cv > 0 ? (rentalIncome / cv) * 100 : 0,
    netYield: cv > 0 ? (operatingSurplus / cv) * 100 : 0,
    ltv: cv > 0 ? (p.mortgageBalance / cv) * 100 : 0,
    isNegativeCashFlow: estimatedCashFlowBeforeTax < 0,
    isNegativeOperatingSurplus: operatingSurplus < 0,
  };
}

export function computePortfolioMetrics(
  properties: Property[],
  metrics: PropertyMetrics[]
): PortfolioMetrics {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const tri = sum(metrics.map(m => m.rentalIncome));
  const toc = sum(metrics.map(m => m.totalOperatingCosts));
  const tfc = sum(metrics.map(m => m.financeCosts));
  const tos = sum(metrics.map(m => m.operatingSurplus));
  const tcf = sum(metrics.map(m => m.estimatedCashFlowBeforeTax));
  const tpv = sum(properties.map(p => p.estimatedCurrentValue || p.purchasePrice));
  const tmb = sum(properties.map(p => p.mortgageBalance));

  const personalMetrics = metrics.filter(m => m.section24);
  const companyMetrics = metrics.filter(m => m.companyProfitProxy);

  return {
    totalRentalIncome: tri,
    totalOperatingCosts: toc,
    totalFinanceCosts: tfc,
    totalOperatingSurplus: tos,
    totalCashFlowBeforeTax: tcf,
    totalPortfolioValue: tpv,
    totalMortgageBalance: tmb,
    portfolioLtv: tpv > 0 ? (tmb / tpv) * 100 : 0,
    portfolioExpenseRatio: tri > 0 ? (toc / tri) * 100 : 0,
    portfolioInterestBurden: tri > 0 ? (tfc / tri) * 100 : 0,
    portfolioGrossYield: tpv > 0 ? (tri / tpv) * 100 : 0,
    portfolioNetYield: tpv > 0 ? (tos / tpv) * 100 : 0,
    propertyCount: properties.length,
    personalCount: properties.filter(p => p.ownershipType === "personal").length,
    companyCount: properties.filter(p => p.ownershipType === "company").length,
    spvCount: properties.filter(p => p.ownershipType === "spv").length,
    totalPersonalRentalProfit: sum(personalMetrics.map(m => m.section24!.rentalProfitBeforeCredit)),
    totalPersonalInterest: sum(personalMetrics.map(m => m.section24!.mortgageInterest)),
    totalPersonalBasicRateCredit: sum(personalMetrics.map(m => m.section24!.basicRateTaxCredit)),
    totalCompanyProfitProxy: sum(companyMetrics.map(m => m.companyProfitProxy!.profitBeforeTax)),
  };
}

export const fmtGBP = (v: number, sign = false): string =>
  `${sign && v > 0 ? "+" : ""}£${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

export const fmtPct = (v: number, d = 1): string => `${v.toFixed(d)}%`;
