"use client";

import type { FormEvent } from "react";
import type { Draft, DraftErrors } from "@/lib/client/draft";
import { CONSIDERATIONS, CURRENCIES, EVENT_TYPES, SETTINGS, type Consideration } from "@/lib/plan/schema";
import styles from "./IntakeForm.module.css";

const EVENT_LABELS = { wedding: "Wedding", birthday: "Birthday", community: "Community" } as const;
const TITLE_PLACEHOLDERS = { wedding: "Asha & Rohan", birthday: "Ananya turns 7", community: "Block B Diwali mela" } as const;
const SETTING_LABELS = { indoor: "Indoor venue", outdoor: "Outdoor", home: "At home" } as const;
const CONSIDERATION_LABELS: Record<Consideration, string> = {
  accessibility: "Wheelchair access",
  dietary: "Dietary needs",
  kids: "Lots of children",
  elderly: "Older guests",
  eco: "Low waste",
};

interface Props {
  draft: Draft;
  errors: DraftErrors;
  busy: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void | Promise<void>;
  onEventTypeChange: (eventType: Draft["eventType"]) => void;
}

export function IntakeForm({ draft, errors, busy, onChange, onSubmit, onEventTypeChange }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const toggleConsideration = (c: Consideration) =>
    onChange({
      considerations: draft.considerations.includes(c)
        ? draft.considerations.filter((x) => x !== c)
        : [...draft.considerations, c],
    });

  const describedBy = (field: keyof Draft) => (errors[field] ? `${field}-error` : undefined);
  const fieldError = (field: keyof Draft) =>
    errors[field] ? (
      <p id={`${field}-error`} className={styles.error}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Event details">
      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Occasion</legend>
        <div className={styles.segmented}>
          {EVENT_TYPES.map((t) => (
            <label key={t} className={styles.segment}>
              <input
                type="radio"
                name="eventType"
                value={t}
                checked={draft.eventType === t}
                onChange={() => onEventTypeChange(t)}
              />
              <span>{EVENT_LABELS[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Name it <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="title"
          className={styles.input}
          value={draft.title}
          maxLength={80}
          placeholder={TITLE_PLACEHOLDERS[draft.eventType]}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title")}
        />
        {fieldError("title")}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className={styles.input}
            value={draft.date}
            onChange={(e) => onChange({ date: e.target.value })}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={describedBy("date")}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="guests">
            Guests
          </label>
          <input
            id="guests"
            className={styles.input}
            inputMode="numeric"
            autoComplete="off"
            value={draft.guests}
            onChange={(e) => onChange({ guests: e.target.value })}
            aria-invalid={Boolean(errors.guests)}
            aria-describedby={describedBy("guests")}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="budget">
            Budget
          </label>
          <div className={styles.money}>
            <select
              aria-label="Currency"
              className={styles.currency}
              value={draft.currency}
              onChange={(e) => onChange({ currency: e.target.value as Draft["currency"] })}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              id="budget"
              className={styles.input}
              inputMode="numeric"
              autoComplete="off"
              value={draft.budget}
              onChange={(e) => onChange({ budget: e.target.value })}
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={describedBy("budget")}
              required
            />
          </div>
        </div>
      </div>
      {fieldError("date")}
      {fieldError("guests")}
      {fieldError("budget")}

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Where</legend>
        <div className={styles.segmented}>
          {SETTINGS.map((s) => (
            <label key={s} className={styles.segment}>
              <input
                type="radio"
                name="setting"
                value={s}
                checked={draft.setting === s}
                onChange={() => onChange({ setting: s })}
              />
              <span>{SETTING_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Plan around</legend>
        <div className={styles.checks}>
          {CONSIDERATIONS.map((c) => (
            <label key={c} className={styles.check}>
              <input
                type="checkbox"
                checked={draft.considerations.includes(c)}
                onChange={() => toggleConsideration(c)}
              />
              <span>{CONSIDERATION_LABELS[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="notes">
          Anything else we should know?
        </label>
        <textarea
          id="notes"
          className={styles.input}
          rows={3}
          maxLength={500}
          value={draft.notes}
          placeholder="Space theme, vegetarian menu, grandmother flying in from Pune..."
          onChange={(e) => onChange({ notes: e.target.value })}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy("notes")}
        />
        {fieldError("notes")}
      </div>

      <button className={styles.submit} type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Drafting your plan..." : "Draft my plan"}
      </button>
    </form>
  );
}
