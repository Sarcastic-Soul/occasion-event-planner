"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, requestPlan, requestRefine } from "@/lib/client/api";
import { defaultDraft, draftFromInput, validateDraft, type Draft, type DraftErrors } from "@/lib/client/draft";
import { errorMessage, isAbortError } from "@/lib/client/errors";
import { localToday } from "@/lib/client/format";
import { loadJson, saveJson } from "@/lib/client/storage";
import { buildBasePlan } from "@/lib/plan/build-plan";
import { eventInputSchema } from "@/lib/plan/schema";
import type { EventPlan } from "@/lib/plan/types";

const PLAN_KEY = "occasion:plan";
const DONE_KEY = "occasion:done";

const noopSubscribe = () => () => {};

/** Today's date on the user's device; null during server rendering. */
function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, localToday, () => null);
}

/** A saved plan can be from an older version or edited by hand, so check its shape before trusting it. */
function restorePlan(saved: unknown, today: string): EventPlan | null {
  if (!saved || typeof saved !== "object") return null;
  const plan = saved as Partial<EventPlan>;
  const input = eventInputSchema.safeParse(plan.input);
  const complete = [plan.timeline, plan.vendors, plan.ideas, plan.budget?.lines].every(Array.isArray);
  return input.success && complete && input.data.date >= today ? { ...(plan as EventPlan), input: input.data } : null;
}

export type Status = "idle" | "loading" | "error";

/** Where focus should go after a submit: the first field with a problem, or the new plan. */
export type FocusTarget = keyof Draft | "plan";

function firstField(errors: DraftErrors): keyof Draft | null {
  return (Object.keys(errors) as (keyof Draft)[])[0] ?? null;
}

/** Server field paths look like "input.guests"; the form only needs the last part. */
function toDraftErrors(fields: ApiError["fields"]): DraftErrors {
  return Object.fromEntries(fields.map((f) => [f.path.split(".").pop(), f.message]));
}

export function usePlanner() {
  const today = useToday();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [serverErrors, setServerErrors] = useState<DraftErrors>({});
  const inFlight = useRef<AbortController | null>(null);

  // Restore the last plan once the device date is known.
  useEffect(() => {
    if (!today || draft) return;
    const restored = restorePlan(loadJson<unknown>(PLAN_KEY), today);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    setPlan(restored);
    setDraft(restored ? draftFromInput(restored.input) : defaultDraft(today));
    setDone(loadJson<Record<string, boolean>>(DONE_KEY) ?? {});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [today, draft]);

  const checked = useMemo(() => (draft && today ? validateDraft(draft, today) : null), [draft, today]);

  // The sheet shows the drafted plan while it matches the form, otherwise a live rule-based preview.
  // While the form has an error, the last drafted plan stays on screen marked as out of date.
  const sheet = useMemo<{ plan: EventPlan; stale: boolean } | null>(() => {
    if (!today || !checked) return null;
    if (!checked.ok) return plan ? { plan, stale: true } : null;
    if (plan && JSON.stringify(plan.input) === JSON.stringify(checked.input)) return { plan, stale: false };
    return { plan: buildBasePlan(checked.input, today), stale: plan !== null };
  }, [checked, plan, today]);

  const errors: DraftErrors = checked && !checked.ok ? checked.errors : serverErrors;

  const acceptPlan = useCallback((next: EventPlan) => {
    setPlan(next);
    setDraft(draftFromInput(next.input));
    saveJson(PLAN_KEY, next);
  }, []);

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setServerErrors({});
  }, []);

  /** Drafts a plan from the form. Returns where focus should go next, or null when nothing changed. */
  const submit = useCallback(async (): Promise<FocusTarget | null> => {
    if (!checked || !today) return null;
    if (!checked.ok) return firstField(checked.errors);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setStatus("loading");
    setMessage("Drafting your plan and asking Gemini for ideas...");
    try {
      const next = await requestPlan(checked.input, today, controller.signal);
      acceptPlan(next);
      setStatus("idle");
      setMessage(
        next.ideasSource === "ai"
          ? "Plan drafted with personal ideas."
          : "Plan drafted. AI ideas are unavailable right now, so these are starter ideas.",
      );
      return "plan";
    } catch (error) {
      if (isAbortError(error)) return null;
      setStatus("error");
      setMessage(errorMessage(error));
      if (error instanceof ApiError && error.fields.length > 0) {
        const fields = toDraftErrors(error.fields);
        setServerErrors(fields);
        return firstField(fields);
      }
    }
    return null;
  }, [checked, today, acceptPlan]);

  const refine = useCallback(
    async (request: string): Promise<string> => {
      if (!sheet || !today) return "";
      const result = await requestRefine(sheet.plan.input, today, request);
      if (result.plan) acceptPlan(result.plan);
      return result.reply;
    },
    [sheet, today, acceptPlan],
  );

  // Ticks are scoped to the event so a new plan does not inherit old checkmarks.
  const scope = sheet ? `${sheet.plan.input.eventType}:${sheet.plan.input.date}` : "";
  const isDone = useCallback((id: string) => Boolean(done[`${scope}/${id}`]), [done, scope]);
  const toggleDone = useCallback(
    (id: string) => {
      setDone((prev) => {
        const key = `${scope}/${id}`;
        const next = { ...prev, [key]: !prev[key] };
        saveJson(DONE_KEY, next);
        return next;
      });
    },
    [scope],
  );

  return { today, draft, errors, sheet, status, message, updateDraft, submit, refine, isDone, toggleDone };
}
