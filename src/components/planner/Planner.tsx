"use client";

import { defaultDraft } from "@/lib/client/draft";
import type { EventType } from "@/lib/plan/schema";
import { IntakeForm } from "./IntakeForm";
import { PlanSheet } from "./PlanSheet";
import { usePlanner } from "./use-planner";
import styles from "./Planner.module.css";

export function Planner() {
  const p = usePlanner();

  // Switching occasion resets sizes to sensible defaults for that kind of event, keeping the user's notes.
  const changeEventType = (eventType: EventType) => {
    if (!p.today || !p.draft) return;
    const fresh = defaultDraft(p.today, eventType);
    p.updateDraft({ ...fresh, title: p.draft.title, notes: p.draft.notes, currency: p.draft.currency });
  };

  // Focus follows the result: the first bad field, or the new plan's title.
  const submit = async () => {
    const target = await p.submit();
    if (target) document.getElementById(target === "plan" ? "plan-title" : target)?.focus();
  };

  return (
    <div className={styles.layout}>
      <section className={styles.intro} aria-labelledby="page-title">
        <h1 id="page-title" className={styles.h1}>
          Plan the day,
          <br />
          not the <em>panic.</em>
        </h1>
        <p className={styles.lede}>
          Tell us the occasion, the date and what you can spend. You get a budget split, a week-by-week timeline and a
          vendor list sized to your guest count, plus ideas made for your event.
        </p>
        {p.draft ? (
          <IntakeForm
            draft={p.draft}
            errors={p.errors}
            busy={p.status === "loading"}
            onChange={p.updateDraft}
            onSubmit={submit}
            onEventTypeChange={changeEventType}
          />
        ) : (
          <p className={styles.placeholder}>Loading the planner...</p>
        )}
        <p className={p.status === "error" ? styles.statusError : styles.status} role="status" aria-live="polite">
          {p.message}
        </p>
      </section>

      <div className={styles.sheetColumn} id="plan">
        {p.sheet ? (
          <PlanSheet
            plan={p.sheet.plan}
            stale={p.sheet.stale}
            isDone={p.isDone}
            onToggle={p.toggleDone}
            onRefine={p.refine}
          />
        ) : (
          <div className={styles.blank}>
            <p>Your plan appears here as soon as the details look right.</p>
          </div>
        )}
      </div>
    </div>
  );
}
