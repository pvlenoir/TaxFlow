// ═══════════════════════════════════════════════════════════════════════════
// TAXFLOW AI v2 — Domain Types
// Section 24-aware, safe metric names, compound insights, persistence
// ═══════════════════════════════════════════════════════════════════════════

export type OwnershipType = "personal" | "company" | "spv";
export type Severity = "critical" | "warning" | "info" | "positive";
export type InsightCategory =
  | "expenses" | "finance" | "profitability" | "yield"
  | "structure" | "risk" | "concentration" | "compound";
export type AppPage = "overview" | "properties" | "insights" | "scenarios" | "settings";

export interface Property {
  id: string;
  name: string;
  addressLabel: string;
  ownershipType: OwnershipType;
  purchasePrice: number;
  estimatedCurrentValue: number;
  annualGrossRent: number;
  annualOperatingExpenses: number;
  annualMortgageInterest: number;
  annualPrincipalRepayment: number;
  mortgageBalance: number;
  estimatedCapex: number;
  managementFees: number;
  voidAllowance: number;
  otherDeductibleCosts: number;
  notes: string;
}

export interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  ownershipType: OwnershipType;
  rentalIncome: number;
  totalOperatingCosts: number;
  financeCosts: number;
  operatingSurplus: number;
  estimatedCashFlowBeforeTax: number;
  section24: {
    rentalProfitBeforeCredit: number;
    mortgageInterest: number;
    basicRateTaxCredit: number;
    illustrativeTaxAt20: number;
    illustrativeTaxAt40: number;
    section24CostAt40: number;
  } | null;
  companyProfitProxy: {
    profitBeforeTax: number;
    illustrativeCorpTax: number;
  } | null;
  expenseRatio: number;
  interestBurdenRatio: number;
  grossYield: number;
  netYield: number;
  ltv: number;
  isNegativeCashFlow: boolean;
  isNegativeOperatingSurplus: boolean;
}

export interface PortfolioMetrics {
  totalRentalIncome: number;
  totalOperatingCosts: number;
  totalFinanceCosts: number;
  totalOperatingSurplus: number;
  totalCashFlowBeforeTax: number;
  totalPortfolioValue: number;
  totalMortgageBalance: number;
  portfolioLtv: number;
  portfolioExpenseRatio: number;
  portfolioInterestBurden: number;
  portfolioGrossYield: number;
  portfolioNetYield: number;
  propertyCount: number;
  personalCount: number;
  companyCount: number;
  spvCount: number;
  totalPersonalRentalProfit: number;
  totalPersonalInterest: number;
  totalPersonalBasicRateCredit: number;
  totalCompanyProfitProxy: number;
}

export interface Insight {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  title: string;
  severity: Severity;
  category: InsightCategory;
  explanation: string;
  whyItMatters: string;
  advisorQuestion: string | null;
  dataPoints: string[];
  estimatedImpact: string | null;
  isCompound: boolean;
  disclaimer: string;
}

export interface PersistedState {
  properties: Property[];
  scenarioTarget: string;
  scenarioAdjustments: { rentPct: number; expPct: number; rateBps: number };
  onboardingComplete: boolean;
  lastSaved: string;
}
