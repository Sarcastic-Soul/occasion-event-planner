# Accessibility

Target: WCAG 2.1 AA. An axe-core 4.10 scan of the live site found 0 violations, both on first load and after submitting a form with errors.

| Need | How it is met | Where |
|---|---|---|
| Every control has a name | Real `<label>` for each input; radio groups and checkboxes in `<fieldset>` with `<legend>` | `IntakeForm.tsx` |
| Errors are clear | Error text linked with `aria-describedby`, field marked `aria-invalid`; on submit, focus moves to the first bad field | `IntakeForm.tsx`, `Planner.tsx` |
| Changes are announced | Status messages in `role="status"` / `aria-live="polite"` regions that stay in the page, so new text is read out | `Planner.tsx`, `PlanSheet.tsx`, `RefineBox.tsx` |
| Focus follows the result | After a plan is drafted, focus moves to its title (`h2#plan-title`, `tabIndex={-1}`) | `Planner.tsx`, `PlanSheet.tsx` |
| Structure | One `h1`, plan title `h2`, each section an `h3` linked with `aria-labelledby`; budget is a real `<table>` with caption and header cells | `PlanSheet.tsx` |
| Screen reader text | Hidden helper text such as "until the event" after the countdown; decorative icons and bars are `aria-hidden` | `PlanSheet.tsx`, `globals.css` |
| Keyboard | Skip link to the main content; visible focus rings; every action is a native button, input or checkbox | `layout.tsx`, `globals.css` |
| Touch | Form controls and buttons at least 44 px tall | `IntakeForm.module.css`, `PlanSheet.module.css` |
| Contrast | Text and control borders meet AA on the paper background | `globals.css` |
| Motion | The plan's entrance animation uses `transform` / `opacity` and is turned off under `prefers-reduced-motion`; other transitions are short colour changes | `PlanSheet.module.css` |
| Output | Print stylesheet so the plan prints or saves as a clean PDF | `PlanSheet.module.css` |

Tested in `tests/intake-form.test.tsx` (accessible names, error links) and `tests/plan-sheet.test.tsx` (headings, checkbox labels).
