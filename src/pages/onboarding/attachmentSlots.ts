import type { AttachmentSlot } from "./types";

const MAXIMUM_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

/** Mandatory slots that still have no file. */
export const missingMandatorySlots = (slots: AttachmentSlot[]): AttachmentSlot[] => slots.filter((slot) => slot.isMandatory && slot.files.length === 0);

/** Step 6 "Save & Next" is enabled only when every mandatory slot has a file. */
export const canProceedFromAttachments = (slots: AttachmentSlot[]): boolean => missingMandatorySlots(slots).length === 0;

/** Slots grouped by their `group`, in the order the groups first appear. */
export function groupSlots(slots: AttachmentSlot[]): { group: string; slots: AttachmentSlot[] }[] {
  const groups: { group: string; slots: AttachmentSlot[] }[] = [];
  for (const slot of slots) {
    const existing = groups.find((entry) => entry.group === slot.group);
    if (existing) existing.slots.push(slot);
    else groups.push({ group: slot.group, slots: [slot] });
  }
  return groups;
}

/** English problem text for a file the browser must not even try to upload, or null when it is fine. */
export function attachmentProblem(file: { name: string; size: number }): string | null {
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) return "Only pdf, doc, docx, jpg & png files are allowed.";
  if (file.size > MAXIMUM_ATTACHMENT_BYTES) return "The file is larger than 10MB.";
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
