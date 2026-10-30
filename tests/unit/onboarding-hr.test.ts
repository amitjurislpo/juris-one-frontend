import { describe, expect, it } from "vitest";
import type { EmployeeInput } from "@/lib/employee-schema";
import { buildRejection, flaggedSections, REVIEW_SECTIONS, toggleFlag } from "@/pages/onboarding/hr/hireReview";
import { newHireErrors, newHireInput } from "@/pages/onboarding/hr/hireForm";
import { canHrEdit, hireActionLabel, hireStatusChip, hireStatusLabel, hiresPath, normalizeHires } from "@/pages/onboarding/hr/hireStatus";

describe("status labels", () => {
  it("names every status of the flow and nothing else", () => {
    expect(hireStatusLabel("NOT_STARTED")).toBe("Not started");
    expect(hireStatusLabel("IN_PROGRESS")).toBe("In progress");
    expect(hireStatusLabel("SUBMITTED")).toBe("Submitted - needs review");
    expect(hireStatusLabel("CHANGES_REQUESTED")).toBe("Changes requested");
    expect(hireStatusLabel("APPROVED")).toBe("Approved");
    expect(hireStatusLabel("NOT_REQUIRED")).toBeUndefined();
    expect(hireStatusLabel("REOPENED")).toBeUndefined();
    expect(hireStatusLabel(null)).toBeUndefined();
  });
  it("colours changes requested red and approved green", () => {
    expect(hireStatusChip("CHANGES_REQUESTED")).toBe("bad");
    expect(hireStatusChip("APPROVED")).toBe("ok");
  });
  it("picks the list action and who may edit", () => {
    expect(hireActionLabel("SUBMITTED")).toBe("Review");
    expect(hireActionLabel("APPROVED")).toBe("View");
    expect(hireActionLabel("NOT_STARTED")).toBe("Fill details");
    expect(hireActionLabel("CHANGES_REQUESTED")).toBe("Fill details");
    expect(["NOT_STARTED", "IN_PROGRESS", "CHANGES_REQUESTED"].every(canHrEdit)).toBe(true);
    expect(canHrEdit("SUBMITTED")).toBe(false);
    expect(canHrEdit("APPROVED")).toBe(false);
  });
});

describe("list address and page", () => {
  it("sends only the filters that are set", () => {
    expect(hiresPath({})).toBe("/api/v1/onboardings");
    expect(hiresPath({ status: "All", page: "1" })).toBe("/api/v1/onboardings");
    expect(hiresPath({ status: "SUBMITTED", search: " meera ", page: "2" })).toBe("/api/v1/onboardings?status=SUBMITTED&search=meera&page=2");
  });
  it("reads a page or a bare array", () => {
    expect(normalizeHires({ rows: [{ employeeId: "1" }], total: 31, page: 2, take: 25 })).toMatchObject({ total: 31, page: 2, take: 25 });
    expect(normalizeHires([{ employeeId: "1" }, { employeeId: "2" }])).toMatchObject({ total: 2, page: 1 });
    expect(normalizeHires(null).rows).toEqual([]);
  });
});

describe("review flags", () => {
  it("toggles a section on and off", () => {
    const on = toggleFlag({}, "ADDRESS", true);
    expect(on).toEqual({ ADDRESS: "" });
    expect(toggleFlag({ ...on, ADDRESS: "typo" }, "ADDRESS", true).ADDRESS).toBe("typo");
    expect(toggleFlag(on, "ADDRESS", false)).toEqual({});
  });
  it("lists flagged sections in the fixed order", () => {
    expect(flaggedSections({ FAMILY: "x", PERSONAL: "y" })).toEqual(["PERSONAL", "FAMILY"]);
    expect(REVIEW_SECTIONS).toHaveLength(8);
  });
  it("needs an overall comment, a flagged section and its comment", () => {
    expect(buildRejection("", {}).problems).toEqual({ comment: "Write a comment for the employee", flags: "Mark at least one section as incorrect", sections: {} });
    expect(buildRejection("Fix it", { ACCOUNTS: "  " }).problems?.sections).toEqual({ ACCOUNTS: "Write what is wrong in this section" });
    expect(buildRejection("  ", { ACCOUNTS: "IFSC wrong" }).problems?.comment).toBeDefined();
  });
  it("builds the request body in section order with trimmed text", () => {
    const built = buildRejection(" Please fix ", { ATTACHMENTS: " PAN missing ", PERSONAL: "DOB wrong" });
    expect(built.request).toEqual({ comment: "Please fix", flags: [{ section: "PERSONAL", comment: "DOB wrong" }, { section: "ATTACHMENTS", comment: "PAN missing" }] });
  });
});

describe("onboard employee form", () => {
  const form: EmployeeInput = {
    firstName: "Meera", middleName: "", lastName: "Joshi", fatherName: "", email: "meera@jurislpo.com", phoneCountry: "+91", phone: "9876543210", location: "", joiningOffice: "",
    pan: "", aadhaar: "", uan: "", address: "", designation: "Associate", departmentId: "d1", managerId: "m1", dateOfJoining: "2026-11-01", shift: "IN_DAY", roleId: "r1",
  };
  it("accepts the minimal data without the father's name", () => {
    expect(newHireErrors(form)).toEqual({});
  });
  it("uses the add-employee messages for what is missing", () => {
    const errors = newHireErrors({ ...form, firstName: "", email: "nope", departmentId: "", roleId: "" });
    expect(errors).toMatchObject({ firstName: "First name is required", email: "Enter a valid email", departmentId: "Pick a department", roleId: "Pick a role" });
    expect(errors.fatherName).toBeUndefined();
  });
  it("sends only the minimal fields", () => {
    expect(Object.keys(newHireInput({ ...form, pan: "ABCDE1234F" })).sort()).toEqual(
      ["dateOfJoining", "departmentId", "designation", "firstName", "lastName", "location", "managerId", "phone", "phoneCountry", "roleId", "shift", "workEmail"]);
  });
});
