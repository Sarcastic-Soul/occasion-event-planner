import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { IntakeForm } from "@/components/planner/IntakeForm";
import { defaultDraft } from "@/lib/client/draft";
import { TODAY } from "./fixtures";

afterEach(cleanup);

function renderForm(overrides: Partial<ComponentProps<typeof IntakeForm>> = {}) {
  const props = {
    draft: defaultDraft(TODAY),
    errors: {},
    busy: false,
    onChange: mock(),
    onSubmit: mock(),
    onEventTypeChange: mock(),
    ...overrides,
  };
  render(<IntakeForm {...props} />);
  return props;
}

describe("IntakeForm", () => {
  test("every input has an accessible name", () => {
    renderForm();
    for (const name of ["Date", "Guests", "Budget", "Currency", "Wedding", "Outdoor", "Wheelchair access"]) {
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });

  test("links an error message to its field", () => {
    renderForm({ errors: { guests: "Enter a guest count between 1 and 5,000." } });
    const guests = screen.getByLabelText("Guests");
    expect(guests.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(guests.getAttribute("aria-describedby")!)?.textContent).toContain("guest count");
  });

  test("reports changes and submits", () => {
    const props = renderForm();
    fireEvent.click(screen.getByLabelText("Birthday"));
    expect(props.onEventTypeChange).toHaveBeenCalledWith("birthday");
    fireEvent.click(screen.getByLabelText("Dietary needs"));
    expect(props.onChange).toHaveBeenCalledWith({ considerations: ["dietary"] });
    fireEvent.click(screen.getByRole("button", { name: "Draft my plan" }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });
});
