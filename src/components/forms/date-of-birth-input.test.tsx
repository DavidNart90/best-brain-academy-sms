import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DateOfBirthInput } from "./date-of-birth-input";

describe("DateOfBirthInput", () => {
  it("uses the explicit project date format instead of a locale-dependent date control", () => {
    render(<DateOfBirthInput aria-label="Date of birth" />);

    const input = screen.getByRole("textbox", { name: "Date of birth" });
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "DD-MM-YYYY");
    expect(input).toHaveAttribute("pattern", "[0-9]{2}-[0-9]{2}-[0-9]{4}");
  });
});
