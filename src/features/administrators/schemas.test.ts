import { describe, expect, it } from "vitest";
import {
  administratorAccountDeletionSchema,
  administratorEmailChangeSchema,
} from "./schemas";

describe("administrator email change validation", () => {
  it("normalizes a valid replacement email", () => {
    expect(
      administratorEmailChangeSchema.parse({
        userId: "77cfa610-eab2-4433-a910-5aede135f92f",
        email: "  New.Admin@Example.invalid ",
      }),
    ).toEqual({
      userId: "77cfa610-eab2-4433-a910-5aede135f92f",
      email: "new.admin@example.invalid",
    });
  });

  it("rejects an invalid replacement email", () => {
    expect(
      administratorEmailChangeSchema.safeParse({
        userId: "77cfa610-eab2-4433-a910-5aede135f92f",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

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
