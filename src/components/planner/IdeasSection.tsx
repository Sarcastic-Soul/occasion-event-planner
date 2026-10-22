import { SparkleIcon } from "@phosphor-icons/react";
import { COST_LABELS } from "@/lib/plan/labels";
import type { Idea } from "@/lib/plan/types";
import styles from "./PlanSheet.module.css";

interface Props {
  ideas: Idea[];
  /** True when the ideas were written by Gemini for this event, false for the starter set. */
  personal: boolean;
}

export function IdeasSection({ ideas, personal }: Props) {
  return (
    <section aria-labelledby="ideas-h">
      <h3 id="ideas-h" className={styles.heading}>
        Ideas{" "}
        <span className={styles.aside}>
          {personal ? (
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
  );
}
