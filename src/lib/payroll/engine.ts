/**
 * Payroll maths — pure functions, integer PAISE throughout (REQUIREMENTS §5.8).
 *
 *   earned_component = monthly_rate × paid_days ÷ days_in_month
 *   PF (employee)    = 12% × min(earned Basic, ₹15,000)
 *   net              = gross_earned − PF − PT − TDS − other deductions
 */

export interface Structure { basic: number; hra: number; lta: number; special: number } // paise / month

export interface PayInput {
  structure: Structure;
  daysInMonth: number;
  eligibleDays: number; // max(DOJ, 1st) → min(exit, month end)
  lopDays: number; // may be fractional (0.5 steps)
  bonus: number; // paise
  otherDeduction: number; // paise
  tds: number; // paise
  pfRate: number; // 0.12
  pfWageCeiling: number; // paise (₹15,000 → 1_500_000)
  professionalTax: number; // paise per month (when anything is earned)
}

interface PayLine { label: string; rate: number; earned: number }

export interface PayResult {
  daysInMonth: number;
  eligibleDays: number;
  lopDays: number;
  paidDays: number;
  components: PayLine[];
  bonus: number;
  grossEarned: number;
  pf: number;
  pt: number;
  tds: number;
  otherDeduction: number;
  totalDeductions: number;
  net: number;
}

export function computePay(input: PayInput): PayResult {
  const lop = Math.min(Math.max(0, input.lopDays), input.eligibleDays);
  const paidDays = Math.max(0, input.eligibleDays - lop);
  // earned amounts are rounded to whole rupees (100 paise), as on a printed payslip
  const earnedFor = (rate: number) => Math.round((rate * paidDays) / input.daysInMonth / 100) * 100;
  const components: PayLine[] = [
    { label: "Basic", rate: input.structure.basic, earned: earnedFor(input.structure.basic) },
    { label: "House rent allowance", rate: input.structure.hra, earned: earnedFor(input.structure.hra) },
    { label: "Leave travel allowance", rate: input.structure.lta, earned: earnedFor(input.structure.lta) },
    { label: "Special allowance", rate: input.structure.special, earned: earnedFor(input.structure.special) },
  ];
  const grossEarned = components.reduce((a, c) => a + c.earned, 0) + input.bonus;
  const pf = Math.round(input.pfRate * Math.min(components[0].earned, input.pfWageCeiling));
  const professionalTax = grossEarned > 0 ? input.professionalTax : 0;
  const totalDeductions = pf + professionalTax + input.tds + input.otherDeduction;
  return { daysInMonth: input.daysInMonth, eligibleDays: input.eligibleDays, lopDays: lop, paidDays, components, bonus: input.bonus, grossEarned, pf, pt: professionalTax, tds: input.tds, otherDeduction: input.otherDeduction, totalDeductions, net: grossEarned - totalDeductions };
}

/** Days in [max(dateOfJoining, 1st), min(exit, month end)] — 0 if not employed that month. */
export function eligibleDays(month: string, dateOfJoining: string, exit: string | null): number {
  const [year, monthNumber] = month.split("-").map(Number);
  const dim = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const first = `${month}-01`, last = `${month}-${String(dim).padStart(2, "0")}`;
  const from = dateOfJoining > first ? dateOfJoining : first;
  const periodEnd = exit && exit < last ? exit : last;
  if (from > periodEnd) return 0;
  return Math.round((Date.parse(periodEnd) - Date.parse(from)) / 86400_000) + 1;
}

/** "Split" helper: Basic 50% · HRA 20% · LTA 5% · Special = the rest (paise, rupee-rounded). */
export function splitGross(target: number): Structure {
  const roundToRupee = (x: number) => Math.round(x / 100) * 100;
  const basic = roundToRupee(target * 0.5), hra = roundToRupee(target * 0.2), lta = roundToRupee(target * 0.05);
  return { basic, hra, lta, special: target - basic - hra - lta };
}

/** Rupees in words, Indian system (for the payslip). */
export function rupeesInWords(amount: number): string {
  amount = Math.round(amount);
  if (!amount) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (belowHundred: number) => (belowHundred < 20 ? ones[belowHundred] : tens[Math.floor(belowHundred / 10)] + (belowHundred % 10 ? " " + ones[belowHundred % 10] : ""));
  const three = (belowThousand: number) => (belowThousand >= 100 ? ones[Math.floor(belowThousand / 100)] + " Hundred" + (belowThousand % 100 ? " " : "") : "") + (belowThousand % 100 ? two(belowThousand % 100) : "");
  const parts: string[] = [];
  const crores = Math.floor(amount / 1e7), lakhs = Math.floor(amount / 1e5) % 100, thousands = Math.floor(amount / 1e3) % 100, rest = amount % 1000;
  if (crores) parts.push((crores >= 100 ? three(crores) : two(crores)) + " Crore");
  if (lakhs) parts.push(two(lakhs) + " Lakh");
  if (thousands) parts.push(two(thousands) + " Thousand");
  if (rest) parts.push(three(rest));
  return parts.join(" ");
}
