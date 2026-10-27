import { describe, expect, it } from "vitest";
import { attachmentProblem, canProceedFromAttachments, formatFileSize, groupSlots, missingMandatorySlots } from "@/pages/onboarding/attachmentSlots";
import type { AttachmentSlot } from "@/pages/onboarding/types";

const file = { id: "f1", fileName: "a.pdf", mime: "application/pdf", sizeBytes: 10, uploadedAt: "2026-10-01T00:00:00Z" };
const slot = (slotKey: string, group: string, isMandatory: boolean, hasFile: boolean): AttachmentSlot => ({ slotKey, group, title: slotKey, tooltip: "", isMandatory, files: hasFile ? [file] : [] });

describe("attachment slots", () => {
  it("lists only mandatory slots without a file", () => {
    const slots = [slot("pan", "Accounts & Statutory", true, false), slot("passport", "Accounts & Statutory", false, false), slot("bank", "Accounts & Statutory", true, true)];
    expect(missingMandatorySlots(slots).map((entry) => entry.slotKey)).toEqual(["pan"]);
    expect(canProceedFromAttachments(slots)).toBe(false);
  });

  it("can proceed when every mandatory slot has a file, or there are none", () => {
    expect(canProceedFromAttachments([slot("pan", "G", true, true), slot("passport", "G", false, false)])).toBe(true);
    expect(canProceedFromAttachments([])).toBe(true);
  });

  it("groups slots in first-seen order", () => {
    const groups = groupSlots([slot("a", "One", true, false), slot("b", "Two", true, false), slot("c", "One", false, false)]);
    expect(groups.map((entry) => [entry.group, entry.slots.map((s) => s.slotKey)])).toEqual([["One", ["a", "c"]], ["Two", ["b"]]]);
  });

  it("checks file type and size before upload", () => {
    expect(attachmentProblem({ name: "scan.PDF", size: 1000 })).toBeNull();
    expect(attachmentProblem({ name: "photo.jpg", size: 1000 })).toBeNull();
    expect(attachmentProblem({ name: "virus.exe", size: 1000 })).toMatch(/Only pdf/);
    expect(attachmentProblem({ name: "noextension", size: 1000 })).toMatch(/Only pdf/);
    expect(attachmentProblem({ name: "big.pdf", size: 10 * 1024 * 1024 + 1 })).toMatch(/10MB/);
    expect(attachmentProblem({ name: "empty.pdf", size: 0 })).toMatch(/empty/);
  });

  it("formats file sizes", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
