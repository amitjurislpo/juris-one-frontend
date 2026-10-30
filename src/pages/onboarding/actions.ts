import type { ActionResult } from "@/lib/action";
import { apiAction, apiCall } from "@/lib/api";
import { queryClient } from "@/lib/query";
import type { AttachmentFile, OnboardingView, StepNumber } from "./types";

// The onboarding API of one person. The employee uses `/api/v1/onboarding/mine`; HR filling it on behalf uses `/api/v1/people/{id}/onboarding`
// (same sub-paths). See references/ONBOARDING_WIZARD_API.md.
const enc = encodeURIComponent;

export type OnboardingTarget = { kind: "mine" } | { kind: "hr"; employeeId: string };
export const MINE: OnboardingTarget = { kind: "mine" };

export interface OnboardingSecrets { bankAccountNumber: string; pan: string; aadhaar: string }

export interface OnboardingApi {
  /** The path `useData` reads the whole payload from. */
  viewPath: string;
  /** Saves one step; the answer is the full payload with `currentStep` moved on. A 422 carries `errors` (field path to message). */
  saveStep(step: StepNumber, body: unknown): Promise<ActionResult<OnboardingView>>;
  /** Remembers the step the person is on without saving data (stepper clicks, the Summary edit icons). */
  rememberCurrentStep(step: StepNumber): Promise<ActionResult>;
  /** Uploads one file to a slot with progress (fetch cannot report upload progress, so XHR). */
  uploadAttachment(slotKey: string, file: File, onProgress: (percent: number) => void): Promise<ActionResult<AttachmentFile>>;
  deleteAttachment(attachmentId: string): Promise<ActionResult>;
  /** The full bank account number, PAN and Aadhaar (audited by the API). */
  loadSecrets(): Promise<ActionResult<OnboardingSecrets>>;
  /** Validates every step and the mandatory attachments, then sets SUBMITTED (also a resubmit from CHANGES_REQUESTED). A 422 carries `errors`. */
  submitOnboarding(): Promise<ActionResult>;
  /** Where a file is shown / downloaded. */
  attachmentUrl(fileId: string, isDownload: boolean): string;
}

export function onboardingApiFor(target: OnboardingTarget): OnboardingApi {
  const basePath = target.kind === "mine" ? "/api/v1/onboarding/mine" : `/api/v1/people/${enc(target.employeeId)}/onboarding`;
  return {
    viewPath: basePath,
    saveStep: (step, body) => apiAction<OnboardingView>("PUT", `${basePath}/steps/${step}`, body),
    rememberCurrentStep: (step) => apiAction("PUT", `${basePath}/current-step`, { step }),
    uploadAttachment: (slotKey, file, onProgress) => new Promise((resolve) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${basePath}/attachments`);
      request.setRequestHeader("accept", "application/json");
      request.withCredentials = true;
      request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
      request.onerror = () => resolve({ ok: false, error: "Something went wrong. Please try again." });
      request.onload = () => {
        let json: { ok?: boolean; data?: AttachmentFile; detail?: string; error?: string } & Partial<AttachmentFile> = {};
        try { json = JSON.parse(request.responseText); } catch { /* keep the generic error */ }
        if (request.status >= 200 && request.status < 300) {
          void queryClient.invalidateQueries();
          resolve({ ok: true, data: typeof json.ok === "boolean" ? json.data : (json as AttachmentFile) });
        } else {
          resolve({ ok: false, error: json.detail ?? json.error ?? "Something went wrong. Please try again." });
        }
      };
      const form = new FormData();
      form.append("slotKey", slotKey);
      form.append("file", file);
      request.send(form);
    }),
    deleteAttachment: (attachmentId) => apiAction("DELETE", `${basePath}/attachments/${enc(attachmentId)}`),
    loadSecrets: async () => (await apiCall<OnboardingSecrets>("GET", `${basePath}/secrets`)).body,
    submitOnboarding: () => apiAction("POST", `${basePath}/submission`),
    attachmentUrl: (fileId, isDownload) => `${basePath}/attachments/${enc(fileId)}/file?download=${isDownload}`,
  };
}

