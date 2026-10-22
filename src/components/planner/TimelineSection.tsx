import { formatDate } from "@/lib/client/format";
import type { TimelineTask } from "@/lib/plan/types";
import styles from "./PlanSheet.module.css";

interface Props {
  timeline: TimelineTask[];
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
}

/** Splits the timeline into what needs doing now and what can wait. */
export function TimelineSection({ timeline, isDone, onToggle }: Props) {
  const thisWeek = timeline.filter((task) => task.status !== "upcoming");
  const later = timeline.filter((task) => task.status === "upcoming");

  return (
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
  );
}

interface TaskListProps {
  tasks: TimelineTask[];
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
        const rushed = task.status === "rushed";
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
            <span className={rushed ? styles.late : styles.date}>
              {rushed ? "Now, late" : formatDate(task.dueDate)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
