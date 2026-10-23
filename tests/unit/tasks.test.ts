import { describe, expect, it } from "vitest";
import {
  activityValue, applyMove, attachmentProblem, compareDue, describeActivity, dropIndex, dueBucket, formatDue, formatEstimate, formatFileSize, groupByDue,
  insertMention, keyboardMoveIndex, mentionQueryAt, mentionsToNames, namesToMentions, neighboursAt, parseEstimate, priorityRank, splitMentions,
  suggestProjectKey, taskBucket, taskListPath,
} from "@/lib/tasks";

const NAZNEEN = "11111111-2222-3333-4444-555555555555";
const AMIT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("due buckets", () => {
  // 2026-10-21 is a Wednesday: the week ends on Sunday 2026-10-25
  const today = "2026-10-21";
  it("puts dates into overdue / today / this week / later / no date", () => {
    expect(dueBucket("2026-10-20", today)).toBe("OVERDUE");
    expect(dueBucket("2026-10-21", today)).toBe("TODAY");
    expect(dueBucket("2026-10-22", today)).toBe("THIS_WEEK");
    expect(dueBucket("2026-10-25", today)).toBe("THIS_WEEK");
    expect(dueBucket("2026-10-26", today)).toBe("LATER");
    expect(dueBucket(null, today)).toBe("NO_DATE");
  });

  it("treats Sunday as the last day of the week (Monday–Sunday)", () => {
    expect(dueBucket("2026-10-26", "2026-10-25")).toBe("LATER");
    expect(dueBucket("2026-11-01", "2026-10-26")).toBe("THIS_WEEK");
    expect(dueBucket("2026-11-02", "2026-10-26")).toBe("LATER");
  });

  it("trusts the server's isOverdue (a timed task is late on its due day; another zone may still be on time)", () => {
    expect(taskBucket({ dueDate: today, isOverdue: true }, today)).toBe("OVERDUE");
    expect(taskBucket({ dueDate: "2026-10-20", isOverdue: false }, today)).toBe("TODAY");
  });

  it("groups rows in bucket order and leaves empty buckets out", () => {
    const rows = [
      { id: "later", dueDate: "2026-11-30", isOverdue: false },
      { id: "late", dueDate: "2026-10-01", isOverdue: true },
      { id: "none", dueDate: null, isOverdue: false },
    ];
    expect(groupByDue(rows, today).map((group) => [group.bucket, group.rows.map((row) => row.id)])).toEqual([["OVERDUE", ["late"]], ["LATER", ["later"]], ["NO_DATE", ["none"]]]);
  });
});

describe("due display and order", () => {
  it("shows a date-only task as just the date", () => {
    expect(formatDue("2026-10-21", null, "Asia/Kolkata", "Asia/Kolkata")).toBe("21 Oct");
    expect(formatDue(null, null, null, "Asia/Kolkata")).toBe("");
  });

  it("adds the time, and the zone when it is not the viewer's", () => {
    expect(formatDue("2026-10-21", "17:00", "Asia/Kolkata", "Asia/Kolkata")).toBe("21 Oct, 17:00");
    expect(formatDue("2026-10-21", "17:00", "America/New_York", "Asia/Kolkata")).toBe("21 Oct, 17:00 New York time");
    expect(formatDue("2026-10-21", null, "America/New_York", "Asia/Kolkata")).toBe("21 Oct");
  });

  it("adds the year when it is not this year", () => {
    expect(formatDue("2027-01-15", null, null, "Asia/Kolkata", { today: "2026-10-21" })).toBe("15 Jan 2027");
    expect(formatDue("2026-01-15", null, null, "Asia/Kolkata", { today: "2026-10-21" })).toBe("15 Jan");
  });

  it("sorts by date; within a day timed tasks first and date-only last; no date at the end", () => {
    const tasks = [
      { id: "none", dueDate: null, dueTime: null },
      { id: "day", dueDate: "2026-10-21", dueTime: null },
      { id: "five", dueDate: "2026-10-21", dueTime: "17:00" },
      { id: "nine", dueDate: "2026-10-21", dueTime: "09:00" },
      { id: "before", dueDate: "2026-10-20", dueTime: null },
    ];
    expect([...tasks].sort(compareDue).map((task) => task.id)).toEqual(["before", "nine", "five", "day", "none"]);
  });

  it("orders priorities from urgent to none", () => {
    expect(priorityRank("URGENT")).toBeLessThan(priorityRank("HIGH"));
    expect(priorityRank("HIGH")).toBeLessThan(priorityRank("MEDIUM"));
    expect(priorityRank("LOW")).toBeLessThan(priorityRank("NONE"));
  });
});

describe("estimates, files, keys", () => {
  it("formats and reads estimates", () => {
    expect(formatEstimate(45)).toBe("45m");
    expect(formatEstimate(240)).toBe("4h");
    expect(formatEstimate(90)).toBe("1h 30m");
    expect(formatEstimate(null)).toBe("");
    expect(parseEstimate("4h")).toBe(240);
    expect(parseEstimate("1h 30m")).toBe(90);
    expect(parseEstimate("45m")).toBe(45);
    expect(parseEstimate("90")).toBe(90);
    expect(parseEstimate("")).toBeNull();
    expect(parseEstimate("soon")).toBeNaN();
  });

  it("checks attachments before upload (type by extension, at most 10 MB)", () => {
    expect(attachmentProblem("shot.png", 1000)).toBeNull();
    expect(attachmentProblem("Report.DOCX", 1000)).toBeNull();
    expect(attachmentProblem("setup.exe", 1000)).toBe("type");
    expect(attachmentProblem("noextension", 1000)).toBe("type");
    expect(attachmentProblem("big.pdf", 11 * 1024 * 1024)).toBe("size");
    expect(formatFileSize(220 * 1024)).toBe("220 KB");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("suggests a project key from the name", () => {
    expect(suggestProjectKey("Website relaunch")).toBe("WEB");
    expect(suggestProjectKey("People operations")).toBe("PEO");
    expect(suggestProjectKey("A team")).toBe("AT");
    expect(suggestProjectKey("2027 Plan")).toBe("PLA");
    expect(suggestProjectKey("E2E Ops")).toBe("E2E");
    expect(suggestProjectKey("")).toBe("");
  });
});

describe("mentions", () => {
  it("splits stored text into text and mentions (unknown ids keep a null name)", () => {
    expect(splitMentions(`Hi @{${NAZNEEN}}, see @{${AMIT}}!`, { [NAZNEEN]: "Nazneen Khan" })).toEqual([
      { kind: "text", text: "Hi " },
      { kind: "mention", employeeId: NAZNEEN, name: "Nazneen Khan" },
      { kind: "text", text: ", see " },
      { kind: "mention", employeeId: AMIT, name: null },
      { kind: "text", text: "!" },
    ]);
    expect(splitMentions("No mentions here")).toEqual([{ kind: "text", text: "No mentions here" }]);
  });

  it("turns tokens into names for the editor and back", () => {
    const stored = `@{${NAZNEEN}} please check with @{${AMIT}}`;
    const shown = mentionsToNames(stored, { [NAZNEEN]: "Nazneen Khan", [AMIT]: "Amit" });
    expect(shown.text).toBe("@Nazneen Khan please check with @Amit");
    expect(namesToMentions(shown.text, shown.mentioned)).toBe(stored);
  });

  it("prefers the longer name when one name starts another", () => {
    expect(namesToMentions("@Amit Jain and @Amit", [{ id: AMIT, name: "Amit" }, { id: NAZNEEN, name: "Amit Jain" }])).toBe(`@{${NAZNEEN}} and @{${AMIT}}`);
  });

  it("finds the name being typed after @ and inserts the picked person", () => {
    expect(mentionQueryAt("Hello @Naz", 10)).toBe("Naz");
    expect(mentionQueryAt("Hello @", 7)).toBe("");
    expect(mentionQueryAt("mail me@example", 15)).toBeNull();
    expect(mentionQueryAt("Hello Naz", 9)).toBeNull();
    expect(insertMention("Hello @Naz and more", 10, "Nazneen Khan")).toEqual({ text: "Hello @Nazneen Khan  and more", caret: 20 });
    expect(insertMention("No mention", 4, "Amit")).toEqual({ text: "No mention", caret: 4 });
  });
});

describe("board ordering", () => {
  it("finds the drop index from the cards' middles", () => {
    expect(dropIndex([10, 50, 90], 5)).toBe(0);
    expect(dropIndex([10, 50, 90], 60)).toBe(2);
    expect(dropIndex([10, 50, 90], 200)).toBe(3);
  });

  it("gives the neighbours at the drop point, leaving the moved card out", () => {
    expect(neighboursAt(["a", "b", "c"], "x", 0)).toEqual({ previousTaskId: undefined, nextTaskId: "a" });
    expect(neighboursAt(["a", "b", "c"], "x", 3)).toEqual({ previousTaskId: "c", nextTaskId: undefined });
    expect(neighboursAt(["a", "b", "c"], "a", 1)).toEqual({ previousTaskId: "b", nextTaskId: "c" });
    expect(neighboursAt([], "x", 0)).toEqual({ previousTaskId: undefined, nextTaskId: undefined });
  });

  it("moves a card between columns and inside one (optimistic view)", () => {
    const columns = [{ key: "todo", cards: [{ id: "a" }, { id: "b" }] }, { key: "doing", cards: [{ id: "c" }] }];
    expect(applyMove(columns, { taskId: "a", toKey: "doing", index: 1 }).map((column) => column.cards.map((card) => card.id))).toEqual([["b"], ["c", "a"]]);
    expect(applyMove(columns, { taskId: "b", toKey: "todo", index: 0 }).map((column) => column.cards.map((card) => card.id))).toEqual([["b", "a"], ["c"]]);
    expect(applyMove(columns, { taskId: "missing", toKey: "todo", index: 0 })).toBe(columns);
  });

  it("works out keyboard moves and refuses ones that go nowhere", () => {
    expect(keyboardMoveIndex(1, 3, "up")).toBe(0);
    expect(keyboardMoveIndex(1, 3, "down")).toBe(2);
    expect(keyboardMoveIndex(2, 3, "top")).toBe(0);
    expect(keyboardMoveIndex(0, 3, "bottom")).toBe(2);
    expect(keyboardMoveIndex(0, 3, "up")).toBeNull();
    expect(keyboardMoveIndex(2, 3, "down")).toBeNull();
    expect(keyboardMoveIndex(0, 1, "top")).toBeNull();
  });
});

describe("list queries", () => {
  it("merges defaults, the URL's filters and fixed values, and drops screen-only parameters", () => {
    expect(taskListPath("/api/tasks/mine", { relation: "INDIRECT", task: "WEB-12", view: "board", search: "login" }, { relation: "ASSIGNED", sort: "dueDate" }))
      .toBe("/api/tasks/mine?relation=INDIRECT&sort=dueDate&search=login");
    expect(taskListPath("/api/tasks", { projectId: "other" }, {}, { projectId: "p1" })).toBe("/api/tasks?projectId=p1");
    expect(taskListPath("/api/tasks/team", {})).toBe("/api/tasks/team");
  });
});

describe("history sentences", () => {
  it("reads before/after values in their common shapes", () => {
    expect(activityValue("To do")).toBe("To do");
    expect(activityValue({ statusName: "In review" })).toBe("In review");
    expect(activityValue({ assigneeId: "x", assigneeName: "Amit" })).toBe("Amit");
    expect(activityValue(null)).toBe("");
    expect(activityValue('{"statusName":"Done"}')).toBe("Done");
  });

  it("describes each kind as a sentence with placeholders", () => {
    expect(describeActivity({ kind: "STATUS_CHANGED", actorName: "Amit", before: { status: "To do" }, after: { status: "In progress" } }))
      .toEqual({ text: "{name} changed the status from {from} to {to}", vars: { name: "Amit", from: "To do", to: "In progress" } });
    expect(describeActivity({ kind: "PRIORITY_CHANGED", actorName: "Amit", before: "LOW", after: "HIGH" }).vars).toMatchObject({ from: "Low", to: "High" });
    expect(describeActivity({ kind: "ASSIGNEE_CHANGED", actorName: "Riya", before: null, after: { assigneeName: "Pooja" } }).text).toBe("{name} assigned this to {assignee}");
    expect(describeActivity({ kind: "ASSIGNEE_CHANGED", actorName: "Riya", before: { assigneeName: "Pooja" }, after: null }).text).toBe("{name} removed the assignee");
    expect(describeActivity({ kind: "INDIRECT_ASSIGNEE_CHANGED", actorName: "Riya", before: null, after: { name: "Arjun" } }).vars).toMatchObject({ person: "Arjun" });
    expect(describeActivity({ kind: "CREATED", actorName: null, before: null, after: null }).vars.name).toBe("JurisOne");
    expect(describeActivity({ kind: "SOMETHING_NEW", actorName: "Amit", before: null, after: null }).text).toBe("{name} changed this task");
  });
});
