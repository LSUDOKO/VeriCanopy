import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { integrityStatus, tokenIdParts } from "@/lib/format";

describe("IntegrityBadge", () => {
  it("renders score, icon and text label (not colour alone)", () => {
    render(<IntegrityBadge scoreBps={7388} status="Active" />);
    expect(screen.getByText("73.9")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-label")).toContain("Active");
  });
  it("shows a dash when no score is known", () => {
    render(<IntegrityBadge scoreBps={null} status="Pending" />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});

describe("format helpers", () => {
  it("derives Impaired below threshold and splits token ids", () => {
    expect(integrityStatus(4999, "Active")).toBe("Impaired");
    expect(integrityStatus(5000, "Active")).toBe("Active");
    expect(integrityStatus(9000, "UnderReview")).toBe("UnderReview");
    expect(tokenIdParts((3n << 16n) | 2019n)).toEqual({ projectId: 3, vintage: 2019 });
  });
});
