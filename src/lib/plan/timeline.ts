import { addDays, daysBetween } from "./dates";
import type { EventInput, EventType } from "./schema";
import type { TimelineTask } from "./types";

interface TaskTemplate {
  id: string;
  title: string;
  /** Ideal lead time. */
  weeksBefore: number;
  /** Faster option to suggest when the ideal lead time has already passed. */
  fallback?: string;
  when?: (input: EventInput) => boolean;
}

const COMMON_END: TaskTemplate[] = [
  { id: "headcount", title: "Confirm final headcount with caterer", weeksBefore: 1 },
  { id: "runsheet", title: "Share a day-of run sheet with helpers and vendors", weeksBefore: 1 },
  { id: "payments", title: "Settle balances and keep cash for tips", weeksBefore: 0 },
];

const TEMPLATES: Record<EventType, TaskTemplate[]> = {
  wedding: [
    { id: "guestlist", title: "Agree the guest list with both families", weeksBefore: 26 },
    {
      id: "venue",
      title: "Visit and book the venue",
      weeksBefore: 24,
      fallback: "Ask venues for cancelled dates or consider a weekday booking",
    },
    {
      id: "photo",
      title: "Book photographer and videographer",
      weeksBefore: 20,
      fallback: "Look at newer photographers with strong portfolios; top names book out early",
    },
    { id: "caterer", title: "Shortlist caterers and set up tastings", weeksBefore: 16 },
    { id: "attire", title: "Order outfits and plan fittings", weeksBefore: 14, fallback: "Choose ready-to-wear and book express alterations" },
    { id: "savedate", title: "Send save-the-dates", weeksBefore: 12, fallback: "Send a digital invite today instead" },
    { id: "decor", title: "Finalise décor and florist", weeksBefore: 10 },
    { id: "music", title: "Book DJ, band or musicians", weeksBefore: 10 },
    { id: "invites", title: "Send formal invitations", weeksBefore: 6, fallback: "Send digital invitations with an RSVP link" },
    { id: "stay", title: "Arrange stay and transport for outstation guests", weeksBefore: 6 },
    ...COMMON_END,
  ],
  birthday: [
    { id: "theme", title: "Pick the theme and guest list", weeksBefore: 6 },
    { id: "venue", title: "Book the venue or prepare the space", weeksBefore: 5, fallback: "Host at home or a nearby park to skip booking" },
    { id: "invites", title: "Send invites with RSVP date", weeksBefore: 3, fallback: "Message invites today and ask for a reply in 2 days" },
    { id: "entertainment", title: "Book entertainer or plan games", weeksBefore: 3 },
    { id: "cake", title: "Order the cake", weeksBefore: 2 },
    { id: "decor", title: "Buy or order décor", weeksBefore: 1 },
    { id: "gifts", title: "Pack return gifts", weeksBefore: 1, when: (i) => i.considerations.includes("kids") },
    ...COMMON_END,
  ],
  community: [
    { id: "team", title: "Form an organising team and split roles", weeksBefore: 10 },
    {
      id: "permits",
      title: "Apply for permits (police, municipal, sound)",
      weeksBefore: 8,
      fallback: "Call the local office today; ask which permits can be fast-tracked",
      when: (i) => i.setting !== "home",
    },
    { id: "venue", title: "Book venue or public space", weeksBefore: 8 },
    { id: "sponsors", title: "Reach out to local sponsors", weeksBefore: 6 },
    { id: "volunteers", title: "Recruit volunteers and plan shifts", weeksBefore: 4 },
    { id: "promo", title: "Put up posters and post on local groups", weeksBefore: 3 },
    { id: "safety", title: "Arrange first aid, fire safety and waste bins", weeksBefore: 2 },
    ...COMMON_END,
  ],
};

const EXTRA: TaskTemplate[] = [
  {
    id: "access-check",
    title: "Walk the venue for step-free entry, accessible toilets and seating",
    weeksBefore: 8,
    when: (i) => i.considerations.includes("accessibility") || i.considerations.includes("elderly"),
  },
  {
    id: "diet",
    title: "Collect dietary needs with RSVPs and label food on the day",
    weeksBefore: 4,
    when: (i) => i.considerations.includes("dietary"),
  },
  {
    id: "weather",
    title: "Book a canopy or indoor backup in case of rain or heat",
    weeksBefore: 4,
    when: (i) => i.setting === "outdoor",
  },
  {
    id: "eco",
    title: "Arrange reusable plates or compostable serveware",
    weeksBefore: 3,
    when: (i) => i.considerations.includes("eco"),
  },
];

interface ScheduleArgs {
  id: string;
  title: string;
  weeksBefore: number;
  source: TimelineTask["source"];
  fallback?: string;
}

/**
 * Places one task on the calendar. Tasks whose ideal date has passed are pulled
 * to today and marked "rushed", with a faster fallback when one exists.
 */
export function scheduleTask(task: ScheduleArgs, eventDate: string, today: string): TimelineTask {
  const { id, title, weeksBefore, source, fallback } = task;
  const leadDays = weeksBefore * 7;
  if (leadDays > daysBetween(today, eventDate)) {
    return { id, title, dueDate: today, status: "rushed", fallback, source };
  }
  const dueDate = addDays(eventDate, -leadDays);
  const status = daysBetween(today, dueDate) <= 7 ? "due-now" : "upcoming";
  return { id, title, dueDate, status, source };
}

export function sortByDue(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Counts back from the event date using the templates that fit this event. */
export function buildTimeline(input: EventInput, today: string): TimelineTask[] {
  const templates = [...TEMPLATES[input.eventType], ...EXTRA].filter((t) => !t.when || t.when(input));
  return sortByDue(templates.map((t) => scheduleTask({ ...t, source: "rules" }, input.date, today)));
}
