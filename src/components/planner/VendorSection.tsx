import { formatDate } from "@/lib/client/format";
import type { VendorItem } from "@/lib/plan/types";
import styles from "./PlanSheet.module.css";

interface Props {
  vendors: VendorItem[];
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
}

/** Vendor ticks share the task store, so their ids are prefixed to never clash with task ids. */
export const vendorDoneId = (vendorId: string) => `vendor/${vendorId}`;

export function VendorSection({ vendors, isDone, onToggle }: Props) {
  return (
    <section aria-labelledby="vendor-h">
      <h3 id="vendor-h" className={styles.heading}>
        Vendor checklist
      </h3>
      <ul className={styles.vendors}>
        {vendors.map((vendor) => {
          const id = vendorDoneId(vendor.id);
          const done = isDone(id);
          return (
            <li key={vendor.id} className={done ? styles.done : undefined}>
              <div className={styles.vendorHead}>
                <label>
                  <input type="checkbox" checked={done} onChange={() => onToggle(id)} />
                  <strong>{vendor.name}</strong>
                </label>
                <span className={vendor.late ? styles.late : styles.date}>
                  {vendor.late ? "Book now, late" : `by ${formatDate(vendor.bookBy)}`}
                </span>
              </div>
              <p>{vendor.why}</p>
              {vendor.tip && <p className={styles.tip}>{vendor.tip}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
