"use client";

import { useState, type FormEvent } from "react";
import { ChatTextIcon } from "@phosphor-icons/react";
import { errorMessage } from "@/lib/client/errors";
import { LIMITS } from "@/lib/plan/schema";
import styles from "./PlanSheet.module.css";

const EXAMPLES = ["Cut the budget by 20%", "Make it 40 guests", "Move it outdoors"];

interface Props {
  onRefine: (request: string) => Promise<string>;
}

export function RefineBox({ onRefine }: Props) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const request = text.trim();
    // Same minimum as the server, so a stray keypress does not cost a model call.
    if (request.length < LIMITS.refineMinLength || busy) return;
    setBusy(true);
    try {
      setReply(await onRefine(request));
      setText("");
    } catch (error) {
      setReply(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.refine} onSubmit={submit}>
      <label htmlFor="refine" className={styles.heading}>
        <ChatTextIcon weight="bold" aria-hidden="true" /> Change something in plain words
      </label>
      <div className={styles.refineRow}>
        <input
          id="refine"
          className={styles.refineInput}
          value={text}
          maxLength={LIMITS.refineLength}
          list="refine-examples"
          placeholder={EXAMPLES[0]}
          onChange={(e) => setText(e.target.value)}
        />
        <datalist id="refine-examples">
          {EXAMPLES.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        <button type="submit" className={styles.refineButton} disabled={busy} aria-busy={busy}>
          {busy ? "Updating..." : "Update"}
        </button>
      </div>
      <p className={styles.reply} role="status" aria-live="polite">
        {reply}
      </p>
    </form>
  );
}
