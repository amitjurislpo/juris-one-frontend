import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCall = vi.fn();
const apiAction = vi.fn();
vi.mock("@/lib/api", () => ({ apiCall: (...args: unknown[]) => apiCall(...args), apiAction: (...args: unknown[]) => apiAction(...args) }));

import { applyLeave, preview } from "@/pages/leave/actions";

const base = { type: "CL", from: "2026-11-23", to: "2026-11-23", part: "FULL" as const };

describe("leave actions: applying for an employee (Admin / HR)", () => {
  beforeEach(() => { apiCall.mockReset().mockResolvedValue({ body: { ok: true } }); apiAction.mockReset().mockResolvedValue({ ok: true }); });

  it("previews for oneself without an employeeId", async () => {
    await preview(base);
    expect(apiCall.mock.calls[0][1]).not.toContain("employeeId");
  });

  it("previews for the picked employee, with the id encoded", async () => {
    await preview({ ...base, employeeId: "a b&c" });
    expect(apiCall.mock.calls[0][1]).toContain("employeeId=a+b%26c");
  });

  it("sends the employee id in the request body to the one apply endpoint", async () => {
    await applyLeave({ ...base, employeeId: "5f7c0d1e-0000-4000-8000-000000000001" });
    expect(apiAction).toHaveBeenCalledWith("POST", "/api/v1/leave/requests", expect.objectContaining({ employeeId: "5f7c0d1e-0000-4000-8000-000000000001" }), expect.any(Array));
  });
});
