"use client";

import { PrinterIcon, SparkleIcon, WarningIcon } from "@phosphor-icons/react";
import { formatDate, formatMoney } from "@/lib/client/format";
import type { EventPlan } from "@/lib/plan/types";
import { RefineBox } from "./RefineBox";
import styles from "./PlanSheet.module.css";

const EVENT_NAMES = { wedding: "Wedding", birthday: "Birthday", community: "Community event" } as const;
const COST_LABELS = { low: "Low cost", medium: "Medium cost", high: "Higher cost" } as const;

interface Props {
  plan: EventPlan;
  stale: boolean;
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  onRefine: (request: string) => Promise<string>;
}

export function PlanSheet({ plan, stale, isDone, onToggle, onRefine }: Props) {
  const { input, budget, timeline, vendors, ideas } = plan;
  const money = (n: number) => formatMoney(n, budget.currency);
  const drafted = !stale && plan.ideasSource === "ai";
  const thisWeek = timeline.filter((t) => t.status !== "upcoming");
  const later = timeline.filter((t) => t.status === "upcoming");

  return (
    <article className={styles.sheet} aria-labelledby="plan-title">
      <p className={styles.stamp}>
        {plan.daysLeft === 0 ? "Today" : `${plan.daysLeft} ${plan.daysLeft === 1 ? "day" : "days"} to go`}
        <span className="visually-hidden"> until the event</span>
      </p>
      <h2 id="plan-title" className={styles.title} tabIndex={-1}>
        {input.title ? `${input.title} — ` : ""}
        {EVENT_NAMES[input.eventType]}
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
      {plan.summary && !stale && <p className={styles.summary}>{plan.summary}</p>}

      <section aria-labelledby="budget-h">
        <h3 id="budget-h" className={styles.heading}>
          Budget split <span className={styles.aside}>{money(budget.perGuest)} per guest</span>
        </h3>
        {budget.warnings.map((w) => (
          <p key={w} className={styles.warning}>
            <WarningIcon weight="bold" aria-hidden="true" /> {w}
          </p>
        ))}
        <table className={styles.table}>
          <caption className="visually-hidden">Budget by category</caption>
          <thead className="visually-hidden">
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.id}>
                <th scope="row">
                  {line.label}
                  <span className={styles.bar} aria-hidden="true">
                    <i style={{ transform: `scaleX(${line.share})` }} />
                  </span>
                </th>
                <td>
                  {money(line.amount)}
                  <span className={styles.share}>{Math.round(line.share * 100)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {drafted && plan.budgetTips.length > 0 && (
          <ul className={styles.tips}>
            {plan.budgetTips.map((tip, i) => (
              <li key={`${i}-${tip}`}>{tip}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="time-h">
        <h3 id="time-h" className={styles.heading}>
          Do this week
        </h3>
        <TaskList tasks={thisWeek} isDone={isDone} onToggle={onToggle} empty="Nothing due this week." />
        <h3 id="later-h" className={styles.heading}>
          Then
        </h3>
        <TaskList tasks={later} isDone={isDone} onToggle={onToggle} empty="Everything left is due this week." />
      </section>

      <section aria-labelledby="vendor-h">
        <h3 id="vendor-h" className={styles.heading}>
          Vendor checklist
        </h3>
        <ul className={styles.vendors}>
          {vendors.map((v) => {
            const done = isDone(`vendor/${v.id}`);
            return (
              <li key={v.id} className={done ? styles.done : undefined}>
                <div className={styles.vendorHead}>
                  <label>
                    <input type="checkbox" checked={done} onChange={() => onToggle(`vendor/${v.id}`)} />
                    <strong>{v.name}</strong>
                  </label>
                  <span className={v.late ? styles.late : styles.date}>
                    {v.late ? "Book now, late" : `by ${formatDate(v.bookBy)}`}
                  </span>
                </div>
                <p>{v.why}</p>
                {v.tip && <p className={styles.tip}>{v.tip}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ideas-h">
        <h3 id="ideas-h" className={styles.heading}>
          Ideas{" "}
          <span className={styles.aside}>
            {drafted ? (
              <>
                <SparkleIcon weight="bold" aria-hidden="true" /> Made for this event by Gemini
              </>
            ) : (
              "Starter ideas"
            )}
          </span>
        </h3>
        <ul className={styles.ideas}>
          {ideas.map((idea, i) => (
            <li key={`${i}-${idea.title}`}>
              <strong>{idea.title}</strong>
              <span className={styles.cost}>{COST_LABELS[idea.costHint]}</span>
              <p>{idea.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.footer}>
        <RefineBox onRefine={onRefine} />
        <button type="button" className={styles.print} onClick={() => window.print()}>
          <PrinterIcon weight="bold" aria-hidden="true" /> Print or save as PDF
        </button>
      </div>
    </article>
  );
}

interface TaskListProps {
  tasks: EventPlan["timeline"];
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  empty: string;
}

function TaskList({ tasks, isDone, onToggle, empty }: TaskListProps) {
  if (tasks.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <ul className={styles.tasks}>
      {tasks.map((task) => {
        const done = isDone(task.id);
        return (
          <li key={task.id} className={done ? styles.done : undefined}>
            <label>
              <input type="checkbox" checked={done} onChange={() => onToggle(task.id)} />
              <span>
                {task.title}
                {task.source === "ai" && <span className={styles.badge}>for you</span>}
                {task.fallback && <span className={styles.fallback}>Short on time: {task.fallback}</span>}
              </span>
            </label>
            <span className={task.status === "rushed" ? styles.late : styles.date}>
              {task.status === "rushed" ? "Now, late" : formatDate(task.dueDate)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
