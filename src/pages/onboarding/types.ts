/** The wizard's data as the API sends it (see references/ONBOARDING_WIZARD_API.md). Shared by every onboarding file: change it only together with the contract. */

type OnboardingStatus = "NOT_REQUIRED" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
/** The parts of the form HR can flag when it asks for changes. PERSONAL, ADDRESS and QUALIFICATIONS are the three sections of step 1. */
export type ReviewSection = "PERSONAL" | "ADDRESS" | "QUALIFICATIONS" | "EMPLOYMENT" | "ACCOUNTS" | "FAMILY" | "NOMINATIONS" | "ATTACHMENTS";
export interface ReviewFlag { section: ReviewSection; comment: string }
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type StepStatus = "COMPLETE" | "INCOMPLETE" | "UNVISITED";
/** Server field errors, keyed by JSON path ("education[1].institute"). */
export type FieldErrors = Record<string, string>;

export interface OnboardingHeader {
  name: string; employeeCode: string; photoUrl: string | null; department: string | null; designation: string | null; location: string | null;
  pointOfContact: { name: string; email: string | null; phone: string | null } | null;
}
export interface PersonalInformation {
  bloodGroup: string; personalEmail: string; fatherName: string; maritalStatus: string; marriageDate: string; spouseName: string; countryOfOrigin: string; nationality: string;
  isInternationalEmployee: boolean | null; isPhysicallyChallenged: boolean | null; disabilityType: string; gender: string; dateOfBirth: string;
  heightCm: string; weightKg: string; identificationMark: string; religion: string; caste: string; hobby: string;
}
export interface Address { line1: string; line2: string; line3: string; city: string; district: string; state: string; pin: string; country: string; phone: string }
export interface PresentAddress extends Address { isSameAsPermanent: boolean }
export interface EmergencyContact { name: string; mobile: string; relationship: string }
export interface Education { id: string | null; qualification: string; fromYear: string; toYear: string; institute: string; gradeOrPercentage: string }
export interface Course { id: string | null; courseName: string; institute: string; fromYear: string; toYear: string }
export interface Employment { id: string | null; companyName: string; designation: string; lastDrawnSalary: string; fromDate: string; toDate: string; reasonForLeaving: string; companyAddress: string }
export interface BankDetails {
  country: string; bankAccountNumber: string | null; hasBankAccountNumber: boolean; ifsc: string; bankName: string; branch: string; branchAddress: string; nameAsPerBank: string; accountType: string;
}
export interface StatutoryDetails {
  previousPfNumber: string; uan: string | null; hasUan: boolean; pan: string | null; hasPan: boolean; namePerPan: string; aadhaar: string | null; hasAadhaar: boolean; namePerAadhaar: string;
  passportNumber: string; namePerPassport: string; passportExpiry: string;
}
export interface Guardian { name: string; relationship: string; line1: string; line2: string; line3: string; city: string; state: string; country: string; pin: string; mobile: string; email: string }
export interface FamilyMember {
  id: string | null; name: string; relationship: string; dateOfBirth: string; gender: string; bloodGroup: string; nationality: string; isMinor: boolean; hasMentalIllness: boolean; guardian: Guardian | null;
}
export interface Nominee { familyMemberId: string; percentage: string }
export interface Nominations { epf: Nominee[]; eps: { familyMemberId: string } | null; esi: { familyMemberId: string } | null; gratuity: Nominee[] }
export interface AttachmentFile { id: string; fileName: string; mime: string; sizeBytes: number; uploadedAt: string }
export interface AttachmentSlot { slotKey: string; group: string; title: string; tooltip: string; isMandatory: boolean; files: AttachmentFile[] }

/** `GET /api/v1/onboarding/mine` (and, read-only, `GET /api/v1/people/{id}/onboarding`). */
export interface OnboardingView {
  status: OnboardingStatus; currentStep: StepNumber; stepStatus: Record<StepNumber, StepStatus>; isReadOnly: boolean; submittedAt: string | null;
  header: OnboardingHeader; personal: PersonalInformation; permanentAddress: Address; presentAddress: PresentAddress; emergencyContact: EmergencyContact;
  education: Education[]; courses: Course[]; employments: Employment[]; bank: BankDetails; statutory: StatutoryDetails;
  familyMembers: FamilyMember[]; nominations: Nominations; attachmentSlots: AttachmentSlot[];
  /** HR's overall remark and the flagged sections after a rejection (CHANGES_REQUESTED); cleared when the employee submits again. */
  reviewComment: string | null; reviewFlags: ReviewFlag[]; reviewedAt: string | null; approvedAt: string | null;
}
