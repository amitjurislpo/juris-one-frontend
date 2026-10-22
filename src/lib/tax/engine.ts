/**
 * Income-tax engine — pure functions (REQUIREMENTS §5.9). Amounts are RUPEES here (slabs, caps
 * and limits are stored in rupees per financial year); callers convert to/from paise.
 * Tax rules are data: slabs, rebate, cess, surcharge and section caps come from `tax_years`
 * and `tax_sections`.
 */

interface Slab { upto: number | null; rate: number }
interface Surcharge { above: number; rate: number }

export interface TaxYearConfig {
  regime: "NEW" | "OLD";
  stdDeduction: number;
  rebateLimit: number;
  marginalRelief: boolean; // relief just above the rebate limit (new regime)
  cessRate: number;
  slabs: Slab[];
  surcharge: Surcharge[];
}

interface SlabLine { from: number; to: number | null; rate: number; amount: number }

export interface TaxResult {
  regime: "NEW" | "OLD";
  gross: number; // income before deductions
  standardDeduction: number;
  deductions: number; // old-regime chapter VI-A etc.
  taxable: number;
  slabTax: number;
  rebate: number;
  base: number; // after rebate / marginal relief
  surcharge: number;
  cess: number;
  total: number; // annual tax liability, rounded to the rupee
  lines: SlabLine[];
}

function slabTax(taxable: number, slabs: Slab[]): { tax: number; lines: SlabLine[] } {
  let prev = 0, tax = 0;
  const lines: SlabLine[] = [];
  for (const slab of slabs) {
    const top = slab.upto ?? Infinity;
    const amt = taxable > prev ? (Math.min(taxable, top) - prev) * slab.rate : 0;
    lines.push({ from: prev, to: slab.upto, rate: slab.rate, amount: amt });
    tax += amt;
    if (taxable <= top) break;
    prev = top;
  }
  return { tax, lines };
}

function surchargeOn(taxable: number, base: number, config: TaxYearConfig): number {
  const tiers = [...config.surcharge].sort((a, b) => a.above - b.above).filter((t) => taxable > t.above);
  if (!tiers.length) return 0;
  const tier = tiers[tiers.length - 1];
  let surchargeAmount = base * tier.rate;
  // marginal relief: tax + surcharge may not exceed tax at the threshold + income above it
  const atT = slabTax(tier.above, config.slabs).tax;
  const prevRate = tiers.length > 1 ? tiers[tiers.length - 2].rate : 0;
  const capAtThreshold = atT * (1 + prevRate) + (taxable - tier.above);
  if (base + surchargeAmount > capAtThreshold) surchargeAmount = Math.max(0, capAtThreshold - base);
  return surchargeAmount;
}

/** Annual tax on `gross` income after the standard deduction and `deductions`. */
export function computeTax(gross: number, deductions: number, config: TaxYearConfig): TaxResult {
  const standardDeduction = Math.min(config.stdDeduction, Math.max(0, gross));
  const taxable = Math.max(0, Math.round(gross - standardDeduction - deductions));
  const { tax, lines } = slabTax(taxable, config.slabs);
  let base = tax;
  let rebate = 0;
  if (taxable <= config.rebateLimit) {
    rebate = tax;
    base = 0;
  } else if (config.marginalRelief && tax > taxable - config.rebateLimit) {
    rebate = tax - (taxable - config.rebateLimit);
    base = taxable - config.rebateLimit;
  }
  const surcharge = surchargeOn(taxable, base, config);
  const cess = (base + surcharge) * config.cessRate;
  return { regime: config.regime, gross, standardDeduction, deductions, taxable, slabTax: tax, rebate, base, surcharge, cess, total: Math.round(base + surcharge + cess), lines };
}

// ───────────────────────── old-regime deductions ─────────────────────────

export interface DeductionCaps { c80C: number; c80CCD1B: number; c80DSelf: number; c80DParents: number; c80DParentsSenior: number; c24B: number; c80TTA: number }

export interface Declared {
  rent: number; metro: boolean; parentsSenior: boolean;
  publicProvidentFund: number; elssInvestment: number; lifeInsurancePremium: number; sukanyaSamriddhi: number; tuition: number; homeLoanPrincipal: number; nationalSavingsCertificate: number;
  npsContribution: number; medSelf: number; medParents: number; homeLoanInterest: number; educationLoanInterest: number; donations: number; savingsInterest: number;
}

export const NO_DECLARATIONS: Declared = { rent: 0, metro: false, parentsSenior: false, publicProvidentFund: 0, elssInvestment: 0, lifeInsurancePremium: 0, sukanyaSamriddhi: 0, tuition: 0, homeLoanPrincipal: 0, nationalSavingsCertificate: 0, npsContribution: 0, medSelf: 0, medParents: 0, homeLoanInterest: 0, educationLoanInterest: 0, donations: 0, savingsInterest: 0 };

export interface Deductions { total: number; lines: [string, number][]; hraExemption: number; c80C: number }

/** HRA exemption = least of (HRA received, rent − 10% of Basic, 50% metro / 40% of Basic); caps per section. */
export function oldRegimeDeductions(basicAnnual: number, hraAnnual: number, epfAnnual: number, declared: Declared, caps: DeductionCaps, labels: Record<string, string> = {}): Deductions {
  const labelFor = (labelKey: string, dflt: string) => labels[labelKey] ?? dflt;
  const hra = declared.rent ? Math.max(0, Math.min(hraAnnual, declared.rent - 0.1 * basicAnnual, (declared.metro ? 0.5 : 0.4) * basicAnnual)) : 0;
  const c80C = Math.min(caps.c80C, epfAnnual + declared.publicProvidentFund + declared.elssInvestment + declared.lifeInsurancePremium + declared.sukanyaSamriddhi + declared.tuition + declared.homeLoanPrincipal + declared.nationalSavingsCertificate);
  const nps = Math.min(caps.c80CCD1B, declared.npsContribution);
  const med = Math.min(caps.c80DSelf, declared.medSelf) + Math.min(declared.parentsSenior ? caps.c80DParentsSenior : caps.c80DParents, declared.medParents);
  const hli = Math.min(caps.c24B, declared.homeLoanInterest);
  const sav = Math.min(caps.c80TTA, declared.savingsInterest);
  const lines: [string, number][] = [
    [`${labelFor("HRA", "HRA")} exemption`, hra],
    [`${labelFor("80C", "80C")} (incl. PF)`, c80C],
    [`${labelFor("80CCD1B", "80CCD(1B)")} NPS`, nps],
    [`${labelFor("80D_SELF", "80D")} medical`, med],
    [`${labelFor("24B", "24(b)")} home loan interest`, hli],
    [`${labelFor("80E", "80E")} education loan`, declared.educationLoanInterest],
    [`${labelFor("80G", "80G")} donations`, declared.donations],
    [`${labelFor("80TTA", "80TTA")} savings interest`, sav],
  ].filter((x) => (x[1] as number) > 0) as [string, number][];
  return { total: Math.round(lines.reduce((runningTotal, line) => runningTotal + line[1], 0)), lines: lines.map(([label, amount]) => [label, Math.round(amount)]), hraExemption: Math.round(hra), c80C: Math.round(c80C) };
}

// ───────────────────────── monthly TDS ─────────────────────────

/** FY months from April: "2026-09" → index 5; remaining months including the current one. */
export function financialYearOf(month: string): { fy: string; index: number; remainingInclCurrent: number } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = monthNumber >= 4 ? year : year - 1;
  const index = (monthNumber - 4 + 12) % 12;
  return { fy: `${start}-${String((start + 1) % 100).padStart(2, "0")}`, index, remainingInclCurrent: 12 - index };
}

/**
 * Monthly TDS = (annual tax − TDS already deducted this FY, incl. previous employer) ÷ remaining
 * months including the current one. Never negative.
 */
export function monthlyTds(annualTax: number, alreadyDeducted: number, remainingInclCurrent: number): number {
  if (remainingInclCurrent <= 0) return 0;
  return Math.max(0, Math.round((annualTax - alreadyDeducted) / remainingInclCurrent));
}
