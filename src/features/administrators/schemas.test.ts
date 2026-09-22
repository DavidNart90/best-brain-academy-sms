import { describe, expect, it } from "vitest";
import { administratorAccountDeletionSchema } from "./schemas";

describe("administrator account deletion validation", () => {
  it("normalizes a valid confirmation email", () => {
    expect(
      administratorAccountDeletionSchema.parse({
        userId: "77cfa610-eab2-4433-a910-5aede135f92f",
        confirmationEmail: "  Admin@Example.invalid ",
      }),
    ).toEqual({
      userId: "77cfa610-eab2-4433-a910-5aede135f92f",
      confirmationEmail: "admin@example.invalid",
    });
  });

  it.each([
    {
      userId: "not-a-user-id",
      confirmationEmail: "admin@example.invalid",
    },
    {
      userId: "77cfa610-eab2-4433-a910-5aede135f92f",
      confirmationEmail: "not-an-email",
    },
  ])("rejects an invalid deletion request", (input) => {
    expect(administratorAccountDeletionSchema.safeParse(input).success).toBe(
      false,
    );
  });
});
