import { describe, expect, it } from "vitest";
import { encodeErrorResult, type Abi } from "viem";
import { decodeRevert } from "@/lib/errors";
import ProjectRegistry from "@/lib/abis/ProjectRegistry.json";

describe("decodeRevert", () => {
  it("turns OverlapDetected into a human message", () => {
    const data = encodeErrorResult({ abi: ProjectRegistry as Abi, errorName: "OverlapDetected", args: [613234123n, 1n] });
    expect(decodeRevert(data)).toBe("This land overlaps Project #1 at H3 cell 613234123. The registry refuses double-registration.");
  });
  it("falls back to a generic message", () => {
    expect(decodeRevert(new Error("boom"))).toBe("boom");
  });
});
