import { WarningIcon } from "@phosphor-icons/react";
import type { BudgetPlan } from "@/lib/plan/types";
import styles from "./PlanSheet.module.css";

interface Props {
  budget: BudgetPlan;
  /** Gemini's money-saving tips; empty when the plan has no AI extras. */
  tips: string[];
  money: (amount: number) => string;
}

export function BudgetSection({ budget, tips, money }: Props) {
  return (
    <section aria-labelledby="budget-h">
      <h3 id="budget-h" className={styles.heading}>
        Budget split <span className={styles.aside}>{money(budget.perGuest)} per guest</span>
      </h3>
      {budget.warnings.map((warning) => (
        <p key={warning} className={styles.warning}>
          <WarningIcon weight="bold" aria-hidden="true" /> {warning}
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
      {tips.length > 0 && (
        <ul className={styles.tips}>
          {tips.map((tip, i) => (
            <li key={`${i}-${tip}`}>{tip}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
