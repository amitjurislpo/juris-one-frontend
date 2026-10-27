/** Dropdown lists of the wizard (the English text is what the API stores). */
export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];
export const NATIONALITIES = ["Indian", "Others"];
export const GENDERS = ["Male", "Female", "Others"];
export const DISABILITY_TYPES = ["Locomotor", "Visual", "Hearing", "Speech", "Intellectual", "Multiple", "Other"];
export const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Other", "Prefer not to say"];
export const EMERGENCY_RELATIONSHIPS = ["Brother", "Daughter", "Father", "Husband", "Mother", "Sister", "Son", "Wife"];
export const QUALIFICATIONS = ["10th", "12th", "Diploma", "B.A", "B.Com", "B.Sc", "B.E", "B.Tech", "BCA", "LLB", "M.A", "M.Com", "M.Sc", "M.Tech", "MBA", "MCA", "LLM", "CA", "CS", "PhD", "Other"];
export const ACCOUNT_TYPES = ["Saving", "Current", "Salary"];
export const DEFAULT_COUNTRY = "India";

export const COUNTRIES = [
  "India", "Afghanistan", "Australia", "Bangladesh", "Bhutan", "Canada", "China", "France", "Germany", "Indonesia", "Italy", "Japan", "Malaysia", "Maldives",
  "Myanmar", "Nepal", "Netherlands", "New Zealand", "Oman", "Pakistan", "Qatar", "Russia", "Saudi Arabia", "Singapore", "South Africa", "Sri Lanka", "Switzerland",
  "Thailand", "United Arab Emirates", "United Kingdom", "United States", "Other",
];

/** States and union territories of India. */
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

/** The wizard's six steps in order; `icon` is a name from components/Icon. */
export const STEP_DEFINITIONS = [
  { step: 1, label: "Personal Information", icon: "user" },
  { step: 2, label: "Previous Employment", icon: "building" },
  { step: 3, label: "Accounts & Statutory", icon: "wallet" },
  { step: 4, label: "Family Details", icon: "team" },
  { step: 5, label: "Nomination Details", icon: "shield" },
  { step: 6, label: "Attachments", icon: "paperclip" },
] as const;
