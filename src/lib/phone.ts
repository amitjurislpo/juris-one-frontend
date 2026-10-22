/** Country codes for phone numbers and how many digits the national number has (same list as backend Phones.java). */
export const PHONE_COUNTRIES = [
  { code: "+91", iso: "IN", name: "India", digits: 10, first: "6789" },
  { code: "+1", iso: "US", name: "United States / Canada", digits: 10, first: "23456789" },
  { code: "+44", iso: "GB", name: "United Kingdom", digits: 10, first: "123789" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", digits: 9, first: "5" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", digits: 9, first: "5" },
  { code: "+974", iso: "QA", name: "Qatar", digits: 8, first: "3567" },
  { code: "+65", iso: "SG", name: "Singapore", digits: 8, first: "689" },
  { code: "+61", iso: "AU", name: "Australia", digits: 9, first: "45" },
  { code: "+977", iso: "NP", name: "Nepal", digits: 10, first: "9" },
  { code: "+880", iso: "BD", name: "Bangladesh", digits: 10, first: "1" },
  { code: "+94", iso: "LK", name: "Sri Lanka", digits: 9, first: "7" },
  { code: "+27", iso: "ZA", name: "South Africa", digits: 9, first: "678" },
  { code: "+353", iso: "IE", name: "Ireland", digits: 9, first: "8" },
  { code: "+33", iso: "FR", name: "France", digits: 9, first: "67" },
  { code: "+81", iso: "JP", name: "Japan", digits: 10, first: "789" },
] as const;

export const phoneCountry = (code: string) => PHONE_COUNTRIES.find((c) => c.code === code);

/** Digits allowed for this country's national number (the input stops there). */
export const phoneDigits = (code: string) => phoneCountry(code)?.digits ?? 15;

/** Problem with the number for this country, or null when valid. */
export function phoneProblem(code: string, number: string): string | null {
  const country = phoneCountry(code);
  if (!country) return "Choose the country code";
  const digits = number.replace(/\D/g, "");
  if (digits.length !== country.digits) return `${country.name} numbers have ${country.digits} digits`;
  if (country.first && !country.first.includes(digits[0])) return `That isn't a valid ${country.name} mobile number`;
  return null;
}

/** Splits a stored "+91 8888788888" into the country code and national number ("+91" and an empty number when blank). */
export function splitPhone(value: string): { code: string; number: string } {
  const [code, ...rest] = value.trim().split(/\s+/);
  return phoneCountry(code) ? { code, number: rest.join("") } : { code: "+91", number: value.replace(/\D/g, "") };
}
