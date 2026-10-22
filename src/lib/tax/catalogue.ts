/** Old-regime investment declarations (REQUIREMENTS §5.10, prototype DECL). Client-safe. */
interface DeclItem { field: string; label: string; hint?: string; auto?: boolean; cap?: number }
export interface DeclSection { section: string; key: string; title: string; cap?: number; note: string; items: DeclItem[] }

export const DECLARATION_SECTIONS: DeclSection[] = [
  { section: "HRA", key: "HRA", title: "House rent allowance", note: "Exemption = least of HRA received, rent − 10% of Basic, or 50% (metro) / 40% of Basic.", items: [{ field: "rent", label: "Annual rent paid", hint: "Rent receipts; landlord PAN if rent is above ₹1,00,000 a year" }] },
  { section: "80C", key: "80C", title: "Section 80C", cap: 150000, note: "Combined limit ₹1,50,000. Your PF contribution is included automatically.", items: [
    { field: "epf", label: "Employee provident fund (auto)", auto: true }, { field: "ppf", label: "Public provident fund (PPF)" }, { field: "elss", label: "ELSS mutual funds" },
    { field: "lic", label: "Life insurance premium" }, { field: "ssy", label: "Sukanya Samriddhi Yojana" }, { field: "tuition", label: "Children’s tuition fees" },
    { field: "hlp", label: "Home loan principal" }, { field: "nsc", label: "NSC / 5-year tax-saving FD" }] },
  { section: "80CCD(1B)", key: "80CCD1B", title: "National Pension System", cap: 50000, note: "Additional ₹50,000 over the 80C limit.", items: [{ field: "nps", label: "NPS contribution (Tier I)" }] },
  { section: "80D", key: "80D_SELF", title: "Medical insurance", note: "Self & family up to ₹25,000. Parents up to ₹25,000, or ₹50,000 if senior citizens.", items: [{ field: "medSelf", label: "Self, spouse & children", cap: 25000 }, { field: "medParents", label: "Parents" }] },
  { section: "24(b)", key: "24B", title: "Home loan interest", cap: 200000, note: "Self-occupied property, up to ₹2,00,000.", items: [{ field: "hli", label: "Interest on housing loan" }] },
  { section: "80E", key: "80E", title: "Education loan interest", note: "No upper limit; for higher studies of self, spouse or children.", items: [{ field: "edu", label: "Interest paid this year" }] },
  { section: "80G", key: "80G", title: "Donations", note: "Eligible amount as per the receipt (50% or 100% category).", items: [{ field: "don", label: "Eligible donation amount" }] },
  { section: "80TTA", key: "80TTA", title: "Savings account interest", cap: 10000, note: "Up to ₹10,000 of savings bank interest.", items: [{ field: "sav", label: "Savings interest earned" }] },
];

