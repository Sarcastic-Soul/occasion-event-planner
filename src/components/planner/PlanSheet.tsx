"use client";

import { PrinterIcon } from "@phosphor-icons/react";
import { formatDate, formatMoney } from "@/lib/client/format";
import { EVENT_LABELS } from "@/lib/plan/labels";
import type { EventPlan } from "@/lib/plan/types";
import { BudgetSection } from "./BudgetSection";
import { IdeasSection } from "./IdeasSection";
import { RefineBox } from "./RefineBox";
import { TimelineSection } from "./TimelineSection";
import { VendorSection } from "./VendorSection";
import styles from "./PlanSheet.module.css";

interface Props {
  plan: EventPlan;
  /** The form no longer matches this plan, so Gemini's extras are hidden until it is redrafted. */
  stale: boolean;
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  onRefine: (request: string) => Promise<string>;
}

function countdown(daysLeft: number): string {
  if (daysLeft === 0) return "Today";
  return `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`;
}

export function PlanSheet({ plan, stale, isDone, onToggle, onRefine }: Props) {
  const { input, budget, timeline, vendors, ideas } = plan;
  const money = (amount: number) => formatMoney(amount, budget.currency);
  const personal = !stale && plan.ideasSource === "ai";

  return (
    <article className={styles.sheet} aria-labelledby="plan-title">
      <p className={styles.stamp}>
        {countdown(plan.daysLeft)}
        <span className="visually-hidden"> until the event</span>
      </p>
      <h2 id="plan-title" className={styles.title} tabIndex={-1}>
        {input.title ? `${input.title} — ` : ""}
        {EVENT_LABELS[input.eventType]}
      </h2>
      <p className={styles.meta}>
        {formatDate(input.date)} · {input.guests} guests · {money(budget.total)}
      </p>

      {/* Always in the page, so screen readers announce the text when it appears. */}
      <div role="status">
        {stale && (
          <p className={styles.notice}>Details changed. Press “Draft my plan” to refresh this plan and its ideas.</p>
        )}
      </div>
      {personal && plan.summary && <p className={styles.summary}>{plan.summary}</p>}

      <BudgetSection budget={budget} tips={personal ? plan.budgetTips : []} money={money} />
      <TimelineSection timeline={timeline} isDone={isDone} onToggle={onToggle} />
      <VendorSection vendors={vendors} isDone={isDone} onToggle={onToggle} />
      <IdeasSection ideas={ideas} personal={personal} />

      <div className={styles.footer}>
        <RefineBox onRefine={onRefine} />
        <button type="button" className={styles.print} onClick={() => window.print()}>
          <PrinterIcon weight="bold" aria-hidden="true" /> Print or save as PDF
        </button>
      </div>
    </article>
  );
}
