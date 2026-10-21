import { describe, expect, test } from "bun:test";
import { buildTimeline, scheduleTask } from "@/lib/plan/timeline";
import { buildVendors } from "@/lib/plan/vendors";
import { TODAY, makeInput } from "./fixtures";

describe("scheduleTask", () => {
  test("counts back from the event date", () => {
    const t = scheduleTask({ id: "x", title: "X", weeksBefore: 4, source: "rules" }, "2026-12-30", TODAY);
    expect(t.dueDate).toBe("2026-12-02");
    expect(t.status).toBe("upcoming");
  });

  test("pulls a late task to today and keeps its fallback", () => {
    const t = scheduleTask(
      { id: "x", title: "X", weeksBefore: 12, source: "rules", fallback: "Go digital" },
      "2026-11-10",
      TODAY,
    );
    expect(t).toMatchObject({ dueDate: TODAY, status: "rushed", fallback: "Go digital" });
  });

  test("marks tasks due within a week as due now", () => {
    const t = scheduleTask({ id: "x", title: "X", weeksBefore: 1, source: "rules" }, "2026-11-01", TODAY);
    expect(t.status).toBe("due-now");
  });
});

describe("buildTimeline", () => {
  test("is sorted by due date", () => {
    const dates = buildTimeline(makeInput(), TODAY).map((t) => t.dueDate);
    expect(dates).toEqual([...dates].sort());
  });

  test("adds tasks for the event's needs", () => {
    const ids = buildTimeline(makeInput({ setting: "outdoor", considerations: ["dietary"] }), TODAY).map((t) => t.id);
    expect(ids).toContain("weather");
    expect(ids).toContain("diet");
  });

  test("skips permits for a community event at home", () => {
    const ids = buildTimeline(makeInput({ eventType: "community", setting: "home" }), TODAY).map((t) => t.id);
    expect(ids).not.toContain("permits");
  });
});

describe("buildVendors", () => {
  test("sizes staff to the guest list", () => {
    const caterer = buildVendors(makeInput({ guests: 210 }), TODAY).find((v) => v.id === "caterer")!;
    expect(caterer.why).toContain("11 serving staff");
  });

  test("adds a coordinator only for big events", () => {
    const has = (guests: number) => buildVendors(makeInput({ guests }), TODAY).some((v) => v.id === "coordinator");
    expect(has(300)).toBe(true);
    expect(has(80)).toBe(false);
  });

  test("never sets a book-by date in the past, and flags late bookings", () => {
    const vendors = buildVendors(makeInput({ date: "2026-11-05" }), TODAY);
    expect(vendors.every((v) => v.bookBy >= TODAY)).toBe(true);
    const venue = vendors.find((v) => v.id === "venue")!;
    expect(venue).toMatchObject({ bookBy: TODAY, late: true });
  });

  test("swaps the venue for a rental supplier at home", () => {
    const ids = buildVendors(makeInput({ setting: "home" }), TODAY).map((v) => v.id);
    expect(ids).toContain("rentals");
    expect(ids).not.toContain("venue");
  });

  test("adds a canopy outdoors and accessible transport for older guests", () => {
    const ids = buildVendors(makeInput({ setting: "outdoor", considerations: ["elderly"] }), TODAY).map((v) => v.id);
    expect(ids).toContain("canopy");
    expect(ids).toContain("transport");
    expect(buildVendors(makeInput(), TODAY).map((v) => v.id)).not.toContain("canopy");
  });
});

describe("vendor lead times", () => {
  test("depend on the kind of event", () => {
    const venue = (eventType: "wedding" | "birthday") =>
      buildVendors(makeInput({ eventType, date: "2027-06-30" }), TODAY).find((v) => v.id === "venue")!.bookBy;
    expect(venue("wedding")).toBe("2027-01-13");
    expect(venue("birthday")).toBe("2027-05-26");
  });
});
