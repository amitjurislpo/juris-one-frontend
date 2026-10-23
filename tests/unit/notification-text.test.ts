import { describe, expect, it } from "vitest";
import { hindiNotificationTemplates } from "@/lib/i18n/messages/hi-notifications";
import { localizeDates, translateNotificationText } from "@/lib/notification-text";

/**
 * Every notification text the backend creates (grep of NotificationService.notify / notifyPolicy / notifyDecision / TaskNotificationService
 * notices / the two raw INSERTs / ShellService), as a real sample with the parts that are data listed in `keeps`.
 */
const SAMPLES: { template: string; text: string; keeps: string[] }[] = [
  { template: "{type} ({date}) approved by {name}", text: "Casual leave (14 Oct) approved by Nazneen Khan", keeps: ["Nazneen Khan"] },
  { template: "{type} ({date}) declined by {name}", text: "Sick leave (3 Nov) declined by Amit Shah", keeps: ["Amit Shah"] },
  { template: "{type} ({from} – {to}) approved by {name}", text: "Casual leave (14 Oct – 16 Oct) approved by Nazneen Khan", keeps: ["Nazneen Khan"] },
  { template: "{type} ({from} – {to}) declined by {name}", text: "Casual leave (14 Oct – 16 Oct) declined by Nazneen Khan", keeps: ["Nazneen Khan"] },
  { template: "{kind} for {date} approved by {name} ({role})", text: "Late check-in regularization for 9 Oct approved by Priya Rao (HR)", keeps: ["Priya Rao"] },
  { template: "{kind} for {date} declined by {name} ({role})", text: "Comp-off request for 2 Oct declined by Priya Rao (Admin)", keeps: ["Priya Rao"] },
  { template: "{name} mentioned you on {label}: {title}", text: "Amit Shah mentioned you on WEB-6: Fix the login: page", keeps: ["Amit Shah", "WEB-6", "Fix the login: page"] },
  { template: "{name} commented on {label}: {title}", text: "Amit Shah commented on Personal task: Buy a gift", keeps: ["Amit Shah", "Buy a gift"] },
  { template: "{name} assigned you {label}: {title}", text: "Amit Shah assigned you HR-12: Review offer letters", keeps: ["Amit Shah", "HR-12", "Review offer letters"] },
  { template: "{name} made you accountable for {label}: {title}", text: "Amit Shah made you accountable for HR-12: Review offer letters", keeps: ["Amit Shah", "HR-12", "Review offer letters"] },
  { template: "{label} moved to {status} by {name}", text: "WEB-6 moved to In progress by Nazneen Khan", keeps: ["WEB-6", "Nazneen Khan"] },
  { template: "{label} is overdue (due {due}): {title}", text: "HR-12 is overdue (due 14 Oct 2026 17:30): Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due in 15 minutes (due {due}): {title}", text: "HR-12 is due in 15 minutes (due 14 Oct 2026 17:30): Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due in 1 hour (due {due}): {title}", text: "HR-12 is due in 1 hour (due 14 Oct 2026 17:30): Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due in 4 hours (due {due}): {title}", text: "HR-12 is due in 4 hours (due 14 Oct 2026 17:30): Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due in 1 day (due {due}): {title}", text: "HR-12 is due in 1 day (due 14 Oct 2026 17:30): Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due today at {time}: {title}", text: "HR-12 is due today at 17:30: Review offer letters", keeps: ["HR-12", "17:30", "Review offer letters"] },
  { template: "{label} is due tomorrow at {time}: {title}", text: "HR-12 is due tomorrow at 09:00: Review offer letters", keeps: ["HR-12", "09:00", "Review offer letters"] },
  { template: "{label} is due tomorrow: {title}", text: "HR-12 is due tomorrow: Review offer letters", keeps: ["HR-12", "Review offer letters"] },
  { template: "You were added to the project {name}", text: "You were added to the project Website revamp", keeps: ["Website revamp"] },
  { template: "New policy: {title} — please read and accept it", text: "New policy: Leave policy — please read and accept it", keeps: ["Leave policy"] },
  { template: "Updated policy: {title} — please read and accept it", text: "Updated policy: Leave policy — please read and accept it", keeps: ["Leave policy"] },
  { template: "New policy: {title}", text: "New policy: Dress code", keeps: ["Dress code"] },
  { template: "Updated policy: {title}", text: "Updated policy: Dress code", keeps: ["Dress code"] },
  { template: "Reminder: please read and accept \"{title}\"", text: "Reminder: please read and accept \"Leave policy\"", keeps: ["Leave policy"] },
  { template: "Announcement: {title}", text: "Announcement: Diwali holiday on 1 Nov", keeps: ["Diwali holiday on 1 Nov"] },
  { template: "Asset assigned to you: {tag} ({asset})", text: "Asset assigned to you: AST-014 (Dell Latitude 5440)", keeps: ["AST-014", "Dell Latitude 5440"] },
  { template: "A letter was issued to you: {subject} ({reference})", text: "A letter was issued to you: Offer letter (OFR/2026/001)", keeps: ["Offer letter", "OFR/2026/001"] },
  { template: "{name} submitted their onboarding details — ready for review", text: "Riya Verma submitted their onboarding details — ready for review", keeps: ["Riya Verma"] },
  { template: "Your {month} payslip is ready", text: "Your September 2026 payslip is ready", keeps: ["2026"] },
  { template: "{name} ({code}) joined — salary structure pending", text: "Riya Verma (EMP-0042) joined — salary structure pending", keeps: ["Riya Verma", "EMP-0042"] },
  { template: "{item} proof approved", text: "Section 80C proof approved", keeps: [] },
  { template: "{item} proof rejected — {reason}", text: "Section 80C proof rejected — receipt is not readable", keeps: ["receipt is not readable"] },
  { template: "{n} investment proof approved — your TDS goes down from the next payroll", text: "1 investment proof approved — your TDS goes down from the next payroll", keeps: ["1"] },
  { template: "{n} investment proofs approved — your TDS goes down from the next payroll", text: "3 investment proofs approved — your TDS goes down from the next payroll", keeps: ["3"] },
  { template: "Finance set your tax regime to the new regime", text: "Finance set your tax regime to the new regime", keeps: [] },
  { template: "Finance set your tax regime to the old regime", text: "Finance set your tax regime to the old regime", keeps: [] },
  { template: "Your {plan} subscription has ended — only the employee export works until it is renewed", text: "Your Growth subscription has ended — only the employee export works until it is renewed", keeps: ["Growth"] },
  { template: "Your {plan} subscription ends today ({endsOn}) — contact JurisOne to renew", text: "Your Growth subscription ends today (2026-11-01) — contact JurisOne to renew", keeps: ["Growth", "2026-11-01"] },
  { template: "Your {plan} subscription ends tomorrow ({endsOn}) — contact JurisOne to renew", text: "Your Growth subscription ends tomorrow (2026-11-01) — contact JurisOne to renew", keeps: ["Growth", "2026-11-01"] },
  { template: "Your {plan} subscription ends in {days} days ({endsOn}) — contact JurisOne to renew", text: "Your Growth subscription ends in 5 days (2026-11-01) — contact JurisOne to renew", keeps: ["Growth", "5", "2026-11-01"] },
  { template: "{n} request waiting for approval", text: "1 request waiting for approval", keeps: ["1"] },
  { template: "{n} requests waiting for approval", text: "4 requests waiting for approval", keeps: ["4"] },
  { template: "{n} investment proof to verify", text: "1 investment proof to verify", keeps: ["1"] },
  { template: "{n} investment proofs to verify", text: "2 investment proofs to verify", keeps: ["2"] },
  { template: "{holiday} holiday on {date}", text: "Diwali holiday on Sun, 1 Nov 2026", keeps: ["Diwali", "2026"] },
];

const hindiLetters = /[ऀ-ॿ]/;
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("notification templates", () => {
  it("has a Hindi sentence with the same placeholders for every template", () => {
    for (const [english, hindi] of Object.entries(hindiNotificationTemplates)) {
      expect(hindi, english).toMatch(hindiLetters);
      expect(placeholders(hindi), english).toEqual(placeholders(english));
    }
  });

  it("covers every template the backend creates, and each sample belongs to a known template", () => {
    expect(SAMPLES.map((sample) => sample.template).sort()).toEqual(Object.keys(hindiNotificationTemplates).sort());
  });

  it.each(SAMPLES)("translates \"$text\" and keeps its data", ({ text, keeps }) => {
    const hindi = translateNotificationText("hi", text);
    expect(hindi).not.toBe(text);
    expect(hindi).toMatch(hindiLetters);
    expect(hindi).not.toMatch(/\{\w+\}/);
    for (const kept of keeps) expect(hindi).toContain(kept);
  });

  it("uses the template it was written for", () => {
    for (const { template, text } of SAMPLES) {
      expect(translateNotificationText("hi", text), text).toContain(hindiNotificationTemplates[template].split("{")[0]);
    }
  });
});

describe("translateNotificationText", () => {
  it("translates the status and the task label through the dictionary", () => {
    expect(translateNotificationText("hi", "WEB-6 moved to In progress by Nazneen Khan")).toBe("WEB-6 को Nazneen Khan ने जारी है में ले जाया");
    expect(translateNotificationText("hi", "Amit Shah commented on Personal task: Buy a gift")).toBe("Amit Shah ने निजी कार्य पर टिप्पणी की: Buy a gift");
  });

  it("keeps a custom status as typed and splits at the last \" by \"", () => {
    expect(translateNotificationText("hi", "WEB-6 moved to Waiting by vendor by Nazneen Khan")).toBe("WEB-6 को Nazneen Khan ने Waiting by vendor में ले जाया");
  });

  it("translates enumerations: month, leave type, regularization kind, role", () => {
    expect(translateNotificationText("hi", "Your September 2026 payslip is ready")).toContain("सितंबर 2026");
    expect(translateNotificationText("hi", "Casual leave (14 Oct) approved by Nazneen Khan")).toContain("आकस्मिक छुट्टी");
    expect(translateNotificationText("hi", "Casual leave (14 Oct) approved by Nazneen Khan")).toContain("अक्टू");
    expect(translateNotificationText("hi", "Comp-off request for 2 Oct declined by Priya Rao (HR)")).toContain("(एचआर)");
  });

  it("returns English untouched in English", () => {
    expect(translateNotificationText("en", "WEB-6 moved to In progress by Nazneen Khan")).toBe("WEB-6 moved to In progress by Nazneen Khan");
  });

  it("falls back to the English text for an unknown text, never blank, never throwing", () => {
    expect(translateNotificationText("hi", "Something the backend added later")).toBe("Something the backend added later");
    expect(translateNotificationText("hi", "")).toBe("");
    expect(translateNotificationText("hi", "(((")).toBe("(((");
    expect(translateNotificationText("hi", "x".repeat(5000))).toBe("x".repeat(5000));
  });

  it("matches a long free-text title with line breaks", () => {
    const title = "Line one\nLine two (draft): final";
    expect(translateNotificationText("hi", `Amit Shah mentioned you on WEB-6: ${title}`)).toContain(title);
  });

  it("translates the bell's small captions", () => {
    expect(translateNotificationText("hi", "Approvals")).toBe("स्वीकृतियाँ");
    expect(translateNotificationText("hi", "Finance")).toBe("वित्त");
    expect(translateNotificationText("hi", "Holiday calendar")).toBe("अवकाश कैलेंडर");
    expect(translateNotificationText("hi", "7 Oct, 8:49 pm")).toBe("7 अक्टू, 8:49 अपराह्न");
  });
});

describe("localizeDates", () => {
  it("changes only month, weekday and am/pm words", () => {
    expect(localizeDates("hi", "Mon, 14 Oct 2026")).toBe("सोम, 14 अक्टू 2026");
    expect(localizeDates("hi", "Amit May Be")).toBe("Amit मई Be");
    expect(localizeDates("en", "14 Oct")).toBe("14 Oct");
  });
});
