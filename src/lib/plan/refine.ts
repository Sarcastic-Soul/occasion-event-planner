import { checkEventDate } from "./validation";
import { eventInputSchema, type AiRefinement, type EventInput } from "./schema";

/**
 * Applies model-suggested changes one field at a time, keeping only those that
 * pass the same checks as the intake form. Rejected changes are explained in the reply.
 */
export function applyRefinement(
  input: EventInput,
  { reply, changes }: AiRefinement,
  today: string,
): { input: EventInput; reply: string; changed: boolean } {
  const next: EventInput = { ...input, considerations: [...input.considerations] };
  const rejected: string[] = [];

  if (changes.guests !== null) next.guests = changes.guests;
  if (changes.budget !== null) next.budget = changes.budget;
  if (changes.setting !== null) next.setting = changes.setting;
  if (changes.date !== null) {
    const problem = checkEventDate(changes.date, today);
    if (problem) rejected.push(`date (${problem})`);
    else next.date = changes.date;
  }
  for (const c of changes.addConsiderations) {
    if (!next.considerations.includes(c)) next.considerations.push(c);
  }
  if (changes.notesToAdd) {
    next.notes = [next.notes, changes.notesToAdd].filter(Boolean).join(". ").slice(0, 500);
  }

  const checked = eventInputSchema.safeParse(next);
  if (!checked.success) {
    return { input, reply: "That change would put the plan outside allowed limits, so nothing was changed.", changed: false };
  }

  const changed = JSON.stringify(checked.data) !== JSON.stringify(input);
  const note = rejected.length ? ` Skipped: ${rejected.join(", ")}.` : "";
  return { input: checked.data, reply: reply + note, changed };
}
