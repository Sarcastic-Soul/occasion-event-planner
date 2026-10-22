import { leadDate } from "./dates";
import { needsAccess, type EventInput, type EventType } from "./schema";
import type { VendorItem } from "./types";

interface VendorTemplate {
  id: string;
  name: string;
  /** Lead time in weeks for each kind of event this vendor applies to. */
  weeksBefore: Partial<Record<EventType, number>>;
  why: (input: EventInput) => string;
  tip?: string;
  when?: (input: EventInput) => boolean;
}

const servers = (guests: number) => Math.max(1, Math.ceil(guests / 20));

const VENDORS: VendorTemplate[] = [
  {
    id: "venue",
    name: "Venue",
    weeksBefore: { wedding: 24, birthday: 5, community: 8 },
    why: (i) => `Space for ${i.guests} guests with room to move.`,
    tip: "Ask what is included: chairs, power backup, parking, cleanup.",
    when: (i) => i.setting !== "home",
  },
  {
    id: "rentals",
    name: "Rental supplier",
    weeksBefore: { wedding: 4, birthday: 3, community: 3 },
    why: (i) => `Chairs and tables for ${i.guests}, plus extra for helpers.`,
    when: (i) => i.setting === "home",
  },
  {
    id: "caterer",
    name: "Caterer",
    weeksBefore: { wedding: 12, birthday: 3, community: 6 },
    why: (i) => `Plan about ${servers(i.guests)} serving staff for ${i.guests} guests.`,
    tip: "Get a per-plate price in writing, with what counts as an extra.",
  },
  {
    id: "photographer",
    name: "Photographer",
    weeksBefore: { wedding: 20, birthday: 3 },
    why: (i) =>
      i.eventType === "wedding" ? "Covers every ceremony; most book months ahead." : "A 2-hour slot is usually enough.",
    tip: "Ask for one full gallery, not just highlights.",
  },
  {
    id: "decorator",
    name: "Decorator / florist",
    weeksBefore: { wedding: 10, birthday: 2 },
    why: () => "Sets the look; share photos of the space before quoting.",
  },
  {
    id: "makeup",
    name: "Makeup & hair artist",
    weeksBefore: { wedding: 12 },
    why: () => "Book a trial at least a month before the day.",
  },
  {
    id: "music",
    name: "DJ / band",
    weeksBefore: { wedding: 10 },
    why: () => "Check sound limits and end time with the venue first.",
  },
  {
    id: "baker",
    name: "Baker",
    weeksBefore: { birthday: 2 },
    why: (i) => `Cake for ${i.guests}; about one slice per guest plus a few spare.`,
  },
  {
    id: "entertainer",
    name: "Entertainer or games host",
    weeksBefore: { birthday: 3 },
    why: () => "Keeps children busy for the first hour while adults arrive.",
    when: (i) => i.considerations.includes("kids"),
  },
  {
    id: "sound",
    name: "Sound & stage",
    weeksBefore: { community: 6 },
    why: (i) =>
      i.guests > 200 ? "A crowd this size needs a proper PA, not a speaker." : "A small PA and one mic is enough.",
  },
  {
    id: "firstaid",
    name: "First aid & safety",
    weeksBefore: { community: 3 },
    why: () => "Required for most public permits; keep a trained person on site.",
  },
  {
    id: "cleanup",
    name: "Waste & cleanup crew",
    weeksBefore: { community: 3 },
    why: () => "Separate bins for wet and dry waste keep the space reusable.",
  },
  {
    id: "coordinator",
    name: "Day-of coordinator",
    weeksBefore: { wedding: 12, birthday: 3, community: 6 },
    why: (i) => `With ${i.guests} guests, one person should run the clock so hosts can be present.`,
    when: (i) => i.guests > 150,
  },
  {
    id: "transport",
    name: "Accessible transport",
    weeksBefore: { wedding: 4, birthday: 2, community: 3 },
    why: () => "Step-free vehicle for guests who use wheelchairs or cannot walk far.",
    when: needsAccess,
  },
  {
    id: "canopy",
    name: "Canopy / tent hire",
    weeksBefore: { wedding: 6, birthday: 2, community: 4 },
    why: () => "Shade and rain cover for an outdoor event.",
    when: (i) => i.setting === "outdoor",
  },
];

/** Picks vendors that fit the event and gives each a book-by date (today if already late). */
export function buildVendors(input: EventInput, today: string): VendorItem[] {
  const items: VendorItem[] = [];
  for (const v of VENDORS) {
    const weeks = v.weeksBefore[input.eventType];
    if (weeks === undefined || (v.when && !v.when(input))) continue;
    const due = leadDate(input.date, weeks, today);
    items.push({ id: v.id, name: v.name, why: v.why(input), tip: v.tip, bookBy: due.date, late: due.late });
  }
  return items.sort((a, b) => a.bookBy.localeCompare(b.bookBy));
}
