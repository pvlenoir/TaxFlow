// ═══════════════════════════════════════════════════════════════════════════
// TAXFLOW AI v3 — ENGINE
// Rankings, benchmarking, named scenarios, 3-year projections,
// review checklists, headline finding, accountant prep
// ═══════════════════════════════════════════════════════════════════════════

// This file is imported by the main app artifact.
// All exports are consumed by the UI layer.

export const DISC = "This is for educational and informational purposes only and should not be considered tax, legal, or financial advice.";
export const OWN = { personal: "Personal", company: "Ltd Company", spv: "SPV" };
export const BASIC_RATE = 0.20;
export const HIGHER_RATE = 0.40;
export const CORP_TAX = 0.25;
export const TH = { EXP_H: 45, EXP_C: 60, INT_H: 35, INT_C: 50, LTV_H: 75, LTV_C: 85 };
export const STORE_KEY = "taxflow-v3";

// ─── FORMATTERS ───────────────────────────────────────────────────────────
export const £ = (v, sign = false) => `${sign && v > 0 ? "+" : ""}£${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
export const pct = (v, d = 1) => `${v.toFixed(d)}%`;

// ─── CALCULATIONS (Section 24-aware) ──────────────────────────────────────
export function calcMetrics(p) {
  const ri = p.annualGrossRent;
  const oc = p.annualOperatingExpenses + p.managementFees + p.voidAllowance + p.otherDeductibleCosts;
  const fc = p.annualMortgageInterest;
  const os = ri - oc;
  const cf = ri - oc - fc - p.annualPrincipalRepayment;
  const cv = p.estimatedCurrentValue || p.purchasePrice || 1;

  let s24 = null;
  if (p.ownershipType === "personal") {
    const rpbc = ri - oc;
    const brc = fc * BASIC_RATE;
    const taxAt20 = Math.max(0, rpbc * BASIC_RATE - brc);
    const taxAt40 = Math.max(0, rpbc * HIGHER_RATE - brc);
    const old40 = Math.max(0, (rpbc - fc) * HIGHER_RATE);
    s24 = { rpbc, interest: fc, brc, taxAt20, taxAt40, s24cost40: taxAt40 - old40 };
  }

  let co = null;
  if (p.ownershipType !== "personal") {
    const pbt = ri - oc - fc;
    co = { pbt, corpTax: Math.max(0, pbt * CORP_TAX) };
  }

  return {
    pid: p.id, pname: p.name || "Unnamed", own: p.ownershipType,
    ri, oc, fc, os, cf, s24, co,
    expR: ri > 0 ? (oc / ri) * 100 : 0,
    intR: ri > 0 ? (fc / ri) * 100 : 0,
    gY: cv > 0 ? (ri / cv) * 100 : 0,
    nY: cv > 0 ? (os / cv) * 100 : 0,
    ltv: cv > 0 ? (p.mortgageBalance / cv) * 100 : 0,
    negCF: cf < 0, negOS: os < 0,
  };
}

export function calcPort(ps, ms) {
  const s = a => a.reduce((x, y) => x + y, 0);
  const tri = s(ms.map(m => m.ri)); const toc = s(ms.map(m => m.oc));
  const tfc = s(ms.map(m => m.fc)); const tos = s(ms.map(m => m.os));
  const tcf = s(ms.map(m => m.cf));
  const tpv = s(ps.map(p => p.estimatedCurrentValue || p.purchasePrice));
  const tmb = s(ps.map(p => p.mortgageBalance));
  const pm = ms.filter(m => m.s24); const cm = ms.filter(m => m.co);
  return {
    tri, toc, tfc, tos, tcf, tpv, tmb,
    pLtv: tpv > 0 ? (tmb / tpv) * 100 : 0,
    pExpR: tri > 0 ? (toc / tri) * 100 : 0,
    pIntR: tri > 0 ? (tfc / tri) * 100 : 0,
    pGY: tpv > 0 ? (tri / tpv) * 100 : 0,
    pNY: tpv > 0 ? (tos / tpv) * 100 : 0,
    cnt: ps.length,
    persCnt: ps.filter(p => p.ownershipType === "personal").length,
    corpCnt: ps.filter(p => p.ownershipType !== "personal").length,
    tPersProfit: s(pm.map(m => m.s24.rpbc)),
    tPersInt: s(pm.map(m => m.s24.interest)),
    tPersBRC: s(pm.map(m => m.s24.brc)),
    tCoProfit: s(cm.map(m => m.co.pbt)),
  };
}

// ─── PROPERTY RANKINGS & BENCHMARKING ─────────────────────────────────────
export function rankProperties(ms) {
  if (ms.length < 2) return null;
  const sorted = (key, desc = true) => [...ms].sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key]);
  const median = (key) => {
    const vals = ms.map(m => m[key]).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  };

  const byYield = sorted("gY");
  const byCF = sorted("cf");
  const byExpR = sorted("expR", false);
  const byIntR = sorted("intR");
  const byLtv = sorted("ltv");

  // Best & worst
  const bestYield = byYield[0];
  const worstYield = byYield[byYield.length - 1];
  const bestCF = byCF[0];
  const worstCF = byCF[byCF.length - 1];
  const mostRateSensitive = byIntR[0]; // highest interest burden
  const mostLeveraged = byLtv[0]; // highest LTV
  const leanest = byExpR[0]; // lowest expense ratio
  const costliest = byExpR[byExpR.length - 1]; // highest expense ratio

  // Medians
  const medExpR = median("expR");
  const medIntR = median("intR");
  const medGY = median("gY");
  const medCF = median("cf");

  return {
    bestYield, worstYield, bestCF, worstCF,
    mostRateSensitive, mostLeveraged, leanest, costliest,
    medExpR, medIntR, medGY, medCF,
    rankings: {
      byYield: byYield.map(m => ({ pid: m.pid, pname: m.pname, val: m.gY })),
      byCF: byCF.map(m => ({ pid: m.pid, pname: m.pname, val: m.cf })),
      byExpR: ms.map(m => ({ pid: m.pid, pname: m.pname, val: m.expR })).sort((a,b) => b.val - a.val),
    },
  };
}

// ─── HEADLINE FINDING ─────────────────────────────────────────────────────
export function getHeadline(ms, port, rankings) {
  // Pick the single most important thing to know about this portfolio
  const negCFcount = ms.filter(m => m.negCF).length;
  const totalS24cost = ms.filter(m => m.s24).reduce((s, m) => s + (m.s24.s24cost40 || 0), 0);

  if (negCFcount > ms.length / 2) {
    return { type: "critical", text: `${negCFcount} of ${ms.length} properties have negative cash flow. Your portfolio is consuming more cash than it generates.` };
  }
  if (totalS24cost > 3000 && port.persCnt > 0) {
    return { type: "warning", text: `Section 24 may be adding ~${£(totalS24cost)}/yr to your tax cost across ${port.persCnt} personal ${port.persCnt === 1 ? "property" : "properties"} (illustrative, at higher rate). This is often the largest single tax efficiency gap for UK landlords.` };
  }
  if (port.pLtv > 80) {
    return { type: "warning", text: `Portfolio leverage is ${pct(port.pLtv, 0)} — above typical BTL thresholds. This amplifies both returns and risk, and creates meaningful rate sensitivity.` };
  }
  if (rankings && rankings.worstCF && rankings.worstCF.cf < -3000) {
    return { type: "warning", text: `${rankings.worstCF.pname} is draining ${£(Math.abs(rankings.worstCF.cf))}/yr from your portfolio. This single property is your biggest cash flow risk.` };
  }
  if (port.tcf > 0 && port.pGY > 5) {
    return { type: "positive", text: `Portfolio is generating positive cash flow of ${£(port.tcf)}/yr at ${pct(port.pGY, 1)} gross yield. Focus on maintaining efficiency and reviewing structure.` };
  }
  return { type: "info", text: `Portfolio generates ${£(port.tri)}/yr across ${port.cnt} properties with ${£(port.tcf)}/yr cash flow.` };
}

// ─── NAMED SCENARIO PRESETS ───────────────────────────────────────────────
export const SCENARIO_PRESETS = [
  { id: "rate6", name: "Rates Rise to 6%", desc: "What if your mortgage rate reaches 6%?",
    apply: (p) => {
      const a = { ...p };
      if (p.mortgageBalance > 0) a.annualMortgageInterest = p.mortgageBalance * 0.06;
      return a;
    }},
  { id: "void3m", name: "3-Month Void", desc: "What if your worst property is empty for 3 months?",
    apply: (p, isWorst) => {
      const a = { ...p };
      if (isWorst) a.annualGrossRent = p.annualGrossRent * 0.75;
      return a;
    }},
  { id: "addAgent", name: "Add Letting Agent (10%)", desc: "What if you added a 10% management fee?",
    apply: (p) => {
      const a = { ...p };
      if (p.managementFees === 0) a.managementFees = p.annualGrossRent * 0.10;
      return a;
    }},
  { id: "removeAgent", name: "Remove Agent (Self-Manage)", desc: "What if you managed properties yourself?",
    apply: (p) => ({ ...p, managementFees: 0 })},
  { id: "maintenance25", name: "+25% Maintenance Costs", desc: "What if maintenance costs increased by 25%?",
    apply: (p) => ({ ...p, annualOperatingExpenses: p.annualOperatingExpenses * 1.25 })},
  { id: "worstCase", name: "Portfolio Stress Test", desc: "Rate to 6% + 10% rent drop + 15% cost rise",
    apply: (p) => {
      const a = { ...p };
      a.annualGrossRent = p.annualGrossRent * 0.90;
      a.annualOperatingExpenses = p.annualOperatingExpenses * 1.15;
      if (p.mortgageBalance > 0) a.annualMortgageInterest = p.mortgageBalance * 0.06;
      return a;
    }},
];

// ─── 3-YEAR PROJECTION ───────────────────────────────────────────────────
export function project3Year(props, assumptions = {}) {
  const rentGrowth = assumptions.rentGrowth ?? 0.02; // 2% default
  const costInflation = assumptions.costInflation ?? 0.03; // 3%
  const rateChange = assumptions.rateChange ?? 0; // bps per year

  const years = [0, 1, 2, 3].map(yr => {
    const adjusted = props.map(p => {
      const a = { ...p };
      a.annualGrossRent = p.annualGrossRent * Math.pow(1 + rentGrowth, yr);
      a.annualOperatingExpenses = p.annualOperatingExpenses * Math.pow(1 + costInflation, yr);
      if (rateChange !== 0 && p.mortgageBalance > 0) {
        const curRate = p.annualMortgageInterest / p.mortgageBalance;
        a.annualMortgageInterest = p.mortgageBalance * Math.max(0, curRate + (rateChange * yr) / 10000);
      }
      return a;
    });
    const ms = adjusted.map(calcMetrics);
    const pt = calcPort(adjusted, ms);
    return { year: yr, label: yr === 0 ? "Now" : `Year ${yr}`, ...pt };
  });
  return years;
}

// ─── REVIEW CHECKLIST (retention driver) ──────────────────────────────────
export function generateChecklist(ms, port, rankings) {
  const items = [];
  const add = (id, text, done = false, priority = "normal") =>
    items.push({ id, text, done, priority });

  add("data-complete", "All properties have complete financial data entered",
    ms.length === port.cnt && ms.every(m => m.ri > 0));
  add("review-expenses", "Review operating costs for each property — are all deductible items claimed?");
  add("check-interest", "Confirm mortgage interest figures match latest statements");
  add("review-values", "Update current property values (last checked: unknown)");

  if (port.persCnt > 0) {
    add("s24-review", "Discuss Section 24 impact with accountant for personal properties", false, "high");
    const totalS24 = ms.filter(m => m.s24).reduce((s, m) => s + (m.s24?.s24cost40 || 0), 0);
    if (totalS24 > 1000)
      add("s24-incorporation", `Consider incorporation review — illustrative S24 cost: ${£(totalS24)}/yr at 40%`, false, "high");
  }

  if (rankings && rankings.worstCF && rankings.worstCF.cf < -1000) {
    add("worst-review", `Review ${rankings.worstCF.pname} — worst cash flow at ${£(rankings.worstCF.cf)}/yr`, false, "high");
  }

  if (port.pLtv > 75) {
    add("ltv-review", `Portfolio LTV is ${pct(port.pLtv, 0)} — review refinancing options`);
  }

  add("scenarios-run", "Run stress test scenario to understand downside exposure");
  add("mtd-ready", "Ensure records are Making Tax Digital compliant");
  add("annual-review", "Schedule annual portfolio review with accountant");

  return items;
}

// ─── ACCOUNTANT PREP ──────────────────────────────────────────────────────
export function generateAccountantPrep(props, ms, port, insights, rankings) {
  const lines = [];
  lines.push("TAXFLOW AI — ACCOUNTANT MEETING PREPARATION");
  lines.push("=" .repeat(50));
  lines.push(`Generated: ${new Date().toLocaleDateString("en-GB")}`);
  lines.push(`Portfolio: ${port.cnt} properties, ${£(port.tpv)} value`);
  lines.push("");

  lines.push("PORTFOLIO SUMMARY");
  lines.push("-".repeat(30));
  lines.push(`Total rental income: ${£(port.tri)}/yr`);
  lines.push(`Total operating costs: ${£(port.toc)}/yr (${pct(port.pExpR)} of income)`);
  lines.push(`Total finance costs: ${£(port.tfc)}/yr (${pct(port.pIntR)} of income)`);
  lines.push(`Operating surplus: ${£(port.tos)}/yr`);
  lines.push(`Cash flow before tax: ${£(port.tcf)}/yr`);
  lines.push(`Portfolio LTV: ${pct(port.pLtv, 0)}`);
  lines.push(`Ownership: ${port.persCnt} personal, ${port.corpCnt} corporate`);
  lines.push("");

  if (port.persCnt > 0) {
    lines.push("SECTION 24 POSITION (Personal Properties)");
    lines.push("-".repeat(30));
    const pm = ms.filter(m => m.s24);
    for (const m of pm) {
      lines.push(`${m.pname}: rental profit ${£(m.s24.rpbc)}, interest ${£(m.s24.interest)}, 20% credit ${£(m.s24.brc)}`);
      lines.push(`  Illustrative tax at 40%: ${£(m.s24.taxAt40)} | S24 extra cost: ${£(m.s24.s24cost40)}`);
    }
    lines.push("");
  }

  lines.push("KEY OBSERVATIONS");
  lines.push("-".repeat(30));
  const topInsights = insights.filter(i => i.sev === "critical" || i.sev === "warning").slice(0, 6);
  for (const ins of topInsights) {
    lines.push(`[${ins.sev.toUpperCase()}] ${ins.title}`);
    lines.push(`  ${ins.text}`);
    if (ins.aq) lines.push(`  → Question: ${ins.aq}`);
    lines.push("");
  }

  lines.push("QUESTIONS FOR DISCUSSION");
  lines.push("-".repeat(30));
  const questions = insights.filter(i => i.aq).map(i => i.aq);
  const unique = [...new Set(questions)];
  unique.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push("");

  lines.push(DISC);
  return lines.join("\n");
}

// ─── INSIGHT ENGINE (v3: themed, ranked, benchmarked) ─────────────────────
let _n = 0;
const mid = () => `i-${++_n}`;

export const THEMES = {
  cashflow: { label: "Cash Flow Pressure", color: "#B91C1C" },
  finance: { label: "Finance Burden", color: "#92400E" },
  structure: { label: "Ownership Structure", color: "#1E40AF" },
  concentration: { label: "Portfolio Concentration", color: "#7C3AED" },
  weakness: { label: "Weak Asset Drag", color: "#DC2626" },
  resilience: { label: "Resilience & Stress", color: "#0F766E" },
  efficiency: { label: "Operating Efficiency", color: "#B45309" },
  positive: { label: "Strengths", color: "#166534" },
};

export function genInsights(ps, ms, port, rankings) {
  _n = 0;
  const ins = [];
  const sev = { critical: 0, warning: 1, info: 2, positive: 3 };

  // ── Helper to compute importance score ──
  const score = (severity, hasImpact, isCompound) => {
    let s = (3 - (sev[severity] ?? 2)) * 10;
    if (isCompound) s += 5;
    if (hasImpact) s += 3;
    return s;
  };

  for (const m of ms) {
    const prop = ps.find(p => p.id === m.pid);
    if (!prop) continue;

    // ── BENCHMARKING INSIGHTS (relative to portfolio) ──
    if (rankings && ms.length >= 3) {
      if (rankings.mostRateSensitive?.pid === m.pid && m.intR > 25) {
        ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Most Rate-Sensitive Property in Portfolio",
          sev: "warning", theme: "resilience", cat: "finance",
          text: `${m.pname} has the highest interest burden in your portfolio at ${pct(m.intR)} of income (portfolio median: ${pct(rankings.medIntR)}). This property would be most affected by rate increases.`,
          why: "When rates rise, this property absorbs the largest proportional increase. Understanding your most rate-sensitive asset helps prioritise where to refinance or build reserves.",
          aq: "If rates rise 1–2%, what happens to my cash flow on this property specifically?",
          dp: [`Interest burden: ${pct(m.intR)}`, `Portfolio median: ${pct(rankings.medIntR)}`, `Finance costs: ${£(m.fc)}/yr`],
          impact: null, compound: false, importance: score("warning", false, false) });
      }
      if (rankings.costliest?.pid === m.pid && m.expR > rankings.medExpR + 10) {
        ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Highest Cost Ratio in Portfolio",
          sev: "info", theme: "efficiency", cat: "expenses",
          text: `${m.pname} has the highest expense ratio at ${pct(m.expR)}, ${pct(m.expR - rankings.medExpR)} above your portfolio median of ${pct(rankings.medExpR)}.`,
          why: "Comparing against your own portfolio median is more meaningful than generic benchmarks. This property's costs are significantly above what your other properties achieve.",
          aq: "Can we review the cost breakdown on this property specifically — is there a structural reason it costs more?",
          dp: [`Expense ratio: ${pct(m.expR)}`, `Median: ${pct(rankings.medExpR)}`, `Costs: ${£(m.oc)}`],
          impact: null, compound: false, importance: score("info", false, false) });
      }
      if (rankings.bestYield?.pid === m.pid && ms.length >= 3) {
        ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Strongest Yield in Portfolio",
          sev: "positive", theme: "positive", cat: "profitability",
          text: `${m.pname} delivers the highest gross yield at ${pct(m.gY, 2)} (portfolio median: ${pct(rankings.medGY, 2)}). This is your strongest income-generating asset.`,
          why: "Identifying your best performer helps understand what's working and whether those conditions can be replicated.",
          aq: null, dp: [`Yield: ${pct(m.gY, 2)}`, `Median: ${pct(rankings.medGY, 2)}`],
          impact: null, compound: false, importance: score("positive", false, false) });
      }
      if (rankings.worstCF?.pid === m.pid && m.negCF) {
        ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Most Fragile Property — Worst Cash Flow",
          sev: "critical", theme: "weakness", cat: "profitability",
          text: `${m.pname} has the weakest cash flow at ${£(m.cf)}/yr (portfolio median: ${£(rankings.medCF)}). This property is the biggest drag on portfolio cash generation.`,
          why: "Your weakest property defines your portfolio's fragility. If additional issues arise here — rate increases, voids, unexpected repairs — the impact cascades.",
          aq: "Should I review this property for restructuring, refinancing, or potential disposal?",
          dp: [`Cash flow: ${£(m.cf)}/yr`, `Median: ${£(rankings.medCF)}`],
          impact: `${£(Math.abs(m.cf))}/yr deficit`, compound: false, importance: score("critical", true, false) });
      }
    }

    // ── THRESHOLD-BASED ──
    if (m.ri > 0 && m.expR >= TH.EXP_C) {
      const ex = m.oc - m.ri * 0.35;
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Very High Operating Costs", sev: "critical", theme: "efficiency", cat: "expenses",
        text: `Costs on ${m.pname} consume ${pct(m.expR)} of income (typical: 25–40%).`,
        why: "Directly reduces returns and may indicate costs that can be renegotiated.",
        aq: "Can you review expense breakdown for items above market rate or eligible for different treatment?",
        dp: [`Costs: ${£(m.oc)}`, `Income: ${£(m.ri)}`, `Ratio: ${pct(m.expR)}`],
        impact: ex > 0 ? `~${£(ex)}/yr above 35%` : null, compound: false, importance: score("critical", ex > 0, false) });
    } else if (m.ri > 0 && m.expR >= TH.EXP_H) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Elevated Operating Costs", sev: "warning", theme: "efficiency", cat: "expenses",
        text: `Costs at ${pct(m.expR)} on ${m.pname}, above typical 25–40%.`, why: "Review may reveal costs above market norms.",
        aq: "Are all deductible expenses claimed?", dp: [`Ratio: ${pct(m.expR)}`],
        impact: null, compound: false, importance: score("warning", false, false) });
    }

    if (m.ri > 0 && m.intR >= TH.INT_C) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Finance Costs Dominating Income", sev: "critical", theme: "finance", cat: "finance",
        text: `Interest consumes ${pct(m.intR)} of income on ${m.pname}.`,
        why: "Small rate or rent changes can tip property into negative territory.",
        aq: "Would refinancing improve position?", dp: [`Interest: ${£(m.fc)}/yr`, `Income: ${£(m.ri)}`],
        impact: `${£(m.fc)}/yr interest`, compound: false, importance: score("critical", true, false) });
    }

    if (m.ltv >= TH.LTV_C) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Very High Leverage", sev: "critical", theme: "resilience", cat: "risk",
        text: `LTV on ${m.pname} is ${pct(m.ltv, 0)}.`, why: "Limits refinancing and increases value-decline exposure.",
        aq: "What is my exposure if values fell 10–15%?", dp: [`LTV: ${pct(m.ltv, 0)}`],
        impact: null, compound: false, importance: score("critical", false, false) });
    } else if (m.ltv >= TH.LTV_H) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Elevated Leverage", sev: "warning", theme: "resilience", cat: "risk",
        text: `LTV on ${m.pname} is ${pct(m.ltv, 0)}, above 75%.`, why: "May affect refinancing terms.",
        aq: null, dp: [`LTV: ${pct(m.ltv, 0)}`], impact: null, compound: false, importance: score("warning", false, false) });
    }

    // Section 24
    if (m.s24 && m.s24.s24cost40 > 500) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Section 24 Tax Cost", sev: "warning", theme: "structure", cat: "structure",
        text: `${m.pname} (personal): interest ${£(m.s24.interest)}/yr not deductible. 20% credit only. Illustrative extra cost: ~${£(m.s24.s24cost40)}/yr at 40%.`,
        why: "Section 24 is the biggest tax change for UK personal landlords.",
        aq: "What is my actual Section 24 position? Would incorporation help?",
        dp: [`Profit: ${£(m.s24.rpbc)}`, `Interest: ${£(m.s24.interest)}`, `Credit: ${£(m.s24.brc)}`, `S24 cost: ${£(m.s24.s24cost40)}`],
        impact: `~${£(m.s24.s24cost40)}/yr`, compound: false, importance: score("warning", true, false) });
    }

    // Strong performance
    if (m.gY >= 7 && m.expR < 35 && !m.negCF) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname, title: "Strong Performance", sev: "positive", theme: "positive", cat: "profitability",
        text: `${m.pname}: ${pct(m.gY, 2)} yield, ${pct(m.expR)} costs, positive cash flow.`,
        why: "Well-performing asset.", aq: null, dp: [`Yield: ${pct(m.gY, 2)}`, `CF: ${£(m.cf)}`],
        impact: null, compound: false, importance: score("positive", false, false) });
    }

    // ── COMPOUND ──
    if (m.own === "personal" && m.intR >= 30 && m.ri > 8000 && m.s24 && m.s24.s24cost40 > 200) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname,
        title: "Section 24 Squeeze", sev: "critical", theme: "structure", cat: "compound",
        text: `${m.pname}: personal ownership + ${pct(m.intR)} interest burden + ${£(m.ri)}/yr income. You may be taxed on ${£(m.s24.rpbc)} profit while interest (${£(m.s24.interest)}) gets only 20% credit.`,
        why: "Most common pattern where UK landlords pay substantially more tax than expected.",
        aq: "Would incorporation reduce my overall tax position? What are SDLT and CGT implications?",
        dp: [`Personal`, `Interest: ${pct(m.intR)}`, `S24 cost: ${£(m.s24.s24cost40)}/yr at 40%`],
        impact: `~${£(m.s24.s24cost40)}/yr`, compound: true, importance: score("critical", true, true) });
    }

    if (m.negCF && m.expR >= 40 && m.gY < 5) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname,
        title: "Cash Drain: Low Yield + High Costs", sev: "critical", theme: "cashflow", cat: "compound",
        text: `${m.pname}: ${£(Math.abs(m.cf))}/yr deficit, ${pct(m.expR)} costs, ${pct(m.gY, 2)} yield. Multiple factors against this property.`,
        why: "Only justified by capital growth. Creates ongoing drain.",
        aq: "Tax implications of disposing vs restructuring?",
        dp: [`CF: ${£(m.cf)}`, `Costs: ${pct(m.expR)}`, `Yield: ${pct(m.gY, 2)}`],
        impact: `${£(Math.abs(m.cf))}/yr deficit`, compound: true, importance: score("critical", true, true) });
    }

    if (m.ltv >= 70 && m.negCF) {
      ins.push({ id: mid(), pid: m.pid, pn: m.pname,
        title: "High Leverage + Negative Cash Flow", sev: "critical", theme: "resilience", cat: "compound",
        text: `${m.pname}: ${pct(m.ltv, 0)} LTV + ${£(m.cf)}/yr negative cash flow. Dual risk.`,
        why: "Subsidising property while having limited equity buffer.",
        aq: "Risk if rates rise 1–2% further?",
        dp: [`LTV: ${pct(m.ltv, 0)}`, `CF: ${£(m.cf)}`], impact: null, compound: true,
        importance: score("critical", false, true) });
    }
  }

  // ── PORTFOLIO-LEVEL ──
  if (ps.length >= 2 && port.tri > 0) {
    for (const m of ms) {
      const sh = (m.ri / port.tri) * 100;
      if (sh >= 50) {
        ins.push({ id: mid(), pid: null, pn: null, title: "Concentration Risk", sev: "warning", theme: "concentration", cat: "concentration",
          text: `${m.pname} = ${pct(sh, 0)} of income (${£(m.ri)} of ${£(port.tri)}).`,
          why: "Heavy single-asset dependency.", aq: "Should I diversify?",
          dp: [`Share: ${pct(sh, 0)}`], impact: `${£(m.ri)}/yr at risk`, compound: false,
          importance: score("warning", true, false) });
        break;
      }
    }
  }

  const weak = ms.filter(m => m.negCF);
  if (weak.length > 0 && weak.length < ms.length) {
    const drag = weak.reduce((s, m) => s + m.cf, 0);
    const strong = ms.filter(m => !m.negCF).reduce((s, m) => s + m.cf, 0);
    if (strong > 0 && Math.abs(drag) > strong * 0.3) {
      ins.push({ id: mid(), pid: null, pn: null,
        title: "Weak Properties Dragging Portfolio", sev: "warning", theme: "weakness", cat: "compound",
        text: `${weak.length} ${weak.length === 1 ? "property" : "properties"} losing ${£(Math.abs(drag))}/yr (${weak.map(w => w.pname).join(", ")}), absorbing ${pct(Math.abs(drag) / strong * 100, 0)} of positive cash flow.`,
        why: "Portfolio fragility when underperformers consume profits.",
        aq: "Review weakest for restructuring or disposal?",
        dp: weak.map(w => `${w.pname}: ${£(w.cf)}`), impact: `${£(Math.abs(drag))}/yr drag`,
        compound: true, importance: score("warning", true, true) });
    }
  }

  if (port.persCnt > 0 && port.corpCnt > 0) {
    ins.push({ id: mid(), pid: null, pn: null, title: "Mixed Ownership", sev: "info", theme: "structure", cat: "structure",
      text: `${port.persCnt} personal + ${port.corpCnt} corporate. Different tax regimes.`,
      why: "Interaction creates complexity.",
      aq: "Is my ownership mix optimal?", dp: [`Personal: ${port.persCnt}`, `Corp: ${port.corpCnt}`],
      impact: null, compound: false, importance: score("info", false, false) });
  }

  // Sort by importance score (descending), then severity
  ins.sort((a, b) => (b.importance || 0) - (a.importance || 0));

  // Deduplicate: if same property has both benchmark + threshold insight for same category, keep higher-importance one
  const seen = new Set();
  const deduped = ins.filter(i => {
    const key = `${i.pid}-${i.cat}`;
    if (i.pid && seen.has(key)) return false;
    if (i.pid) seen.add(key);
    return true;
  });

  return deduped;
}

// ─── PERSISTENCE ──────────────────────────────────────────────────────────
export function loadState() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function saveState(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...d, lastSaved: new Date().toISOString() })); } catch {}
}

// ─── SEED ─────────────────────────────────────────────────────────────────
export const SEED = [
  { id: "p1", name: "Manchester Flat", addressLabel: "14 Northern Quarter, M1", ownershipType: "personal", purchasePrice: 185000, estimatedCurrentValue: 210000, annualGrossRent: 12600, annualOperatingExpenses: 2800, annualMortgageInterest: 5920, annualPrincipalRepayment: 2400, mortgageBalance: 148000, estimatedCapex: 1500, managementFees: 1260, voidAllowance: 630, otherDeductibleCosts: 350, notes: "" },
  { id: "p2", name: "Birmingham Terrace", addressLabel: "7 Jewellery Quarter, B18", ownershipType: "personal", purchasePrice: 155000, estimatedCurrentValue: 175000, annualGrossRent: 10800, annualOperatingExpenses: 3200, annualMortgageInterest: 4650, annualPrincipalRepayment: 2100, mortgageBalance: 124000, estimatedCapex: 3500, managementFees: 0, voidAllowance: 900, otherDeductibleCosts: 200, notes: "" },
  { id: "p3", name: "Leeds HMO", addressLabel: "22 Headingley Lane, LS6", ownershipType: "company", purchasePrice: 280000, estimatedCurrentValue: 310000, annualGrossRent: 28800, annualOperatingExpenses: 8500, annualMortgageInterest: 10850, annualPrincipalRepayment: 3600, mortgageBalance: 217000, estimatedCapex: 4000, managementFees: 4320, voidAllowance: 2400, otherDeductibleCosts: 1200, notes: "" },
  { id: "p4", name: "London Studio", addressLabel: "91 Camberwell Rd, SE5", ownershipType: "personal", purchasePrice: 320000, estimatedCurrentValue: 295000, annualGrossRent: 13200, annualOperatingExpenses: 4100, annualMortgageInterest: 11200, annualPrincipalRepayment: 3000, mortgageBalance: 280000, estimatedCapex: 500, managementFees: 1584, voidAllowance: 1100, otherDeductibleCosts: 600, notes: "" },
];
export const blankProp = (n) => ({ id: `p-${Date.now()}-${n}`, name: "", addressLabel: "", ownershipType: "personal", purchasePrice: 0, estimatedCurrentValue: 0, annualGrossRent: 0, annualOperatingExpenses: 0, annualMortgageInterest: 0, annualPrincipalRepayment: 0, mortgageBalance: 0, estimatedCapex: 0, managementFees: 0, voidAllowance: 0, otherDeductibleCosts: 0, notes: "" });

// ─── METRIC DEFINITIONS ───────────────────────────────────────────────────
export const MDEFS = {
  rentalIncome: { l: "Rental Income", f: "Annual gross rent", n: "Before deductions." },
  operatingCosts: { l: "Operating Costs", f: "Expenses + Mgmt + Voids + Other", n: "Non-finance costs." },
  financeCosts: { l: "Finance Costs", f: "Mortgage interest", n: "Personal: NOT deductible (S24). Company: fully deductible." },
  operatingSurplus: { l: "Operating Surplus", f: "Income − Operating Costs", n: "Before finance. Not a taxable figure." },
  cashFlow: { l: "Est. Cash Flow", f: "Income − All Costs − Principal", n: "Cash remaining." },
  s24: { l: "Section 24 (Personal)", f: "Profit = Income − Opex (no interest)\nCredit = Interest × 20%", n: "Personal landlords cannot deduct interest. Illustrative approximation." },
  company: { l: "Company Proxy", f: "Income − Opex − Interest", n: "Corp tax 25%. Dividend costs not shown." },
};
