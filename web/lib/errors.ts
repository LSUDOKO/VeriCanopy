import { type Abi, BaseError, ContractFunctionRevertedError, decodeErrorResult } from "viem";
import ProjectRegistry from "./abis/ProjectRegistry.json";
import VeriCredit from "./abis/VeriCredit.json";
import BufferPool from "./abis/BufferPool.json";
import IntegrityOracle from "./abis/IntegrityOracle.json";
import ChallengeManager from "./abis/ChallengeManager.json";

const ALL_ABI = [...ProjectRegistry, ...VeriCredit, ...BufferPool, ...IntegrityOracle, ...ChallengeManager] as Abi;

const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  OverlapDetected: (a) => `This land overlaps Project #${String(a[1])} at H3 cell ${String(a[0])}. The registry refuses double-registration.`,
  NotDeveloper: () => "Only the project developer can do this.",
  InvalidStatus: () => "The project is not in the right status for this action.",
  ScoreTooLow: () => "The latest finalised integrity score is below the issuance threshold.",
  ProjectFrozen: () => "This project's credits are frozen after a buffer shortfall; they cannot move or be retired.",
  ProjectNotActive: () => "The project is not active.",
  InsufficientStake: () => "Oracle stake is below the minimum.",
  InsufficientBond: () => "Challenge bond must be at least max(minChallengeBond, stake / 2).",
  SubmissionNotChallengeable: () => "This submission cannot be challenged (window closed, already challenged, or not pending).",
  InvalidZkProof: () => "The zk proof did not verify against the registered model.",
  InvalidInstances: () => "The proof's public instances are malformed.",
  WindowNotOver: () => "The challenge window has not closed yet.",
  SubmissionNotPending: () => "The submission is not pending (challenged, finalised, rejected or voided).",
  PeriodNotMonotonic: () => "A newer period has already been finalised for this project.",
  AlreadyVoted: () => "This resolver already voted.",
  ChallengeNotOpen: () => "The challenge is not open.",
  NothingToWithdraw: () => "Nothing to withdraw.",
  AccessControlUnauthorizedAccount: () => "Your wallet does not have the required role.",
};

/** Decode a custom error from a viem/wagmi error (or raw revert data) into a human sentence. */
export function decodeRevert(err: unknown): string {
  let data: `0x${string}` | undefined;
  let name: string | undefined;
  let args: readonly unknown[] = [];
  if (err instanceof BaseError) {
    const rev = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (rev?.data) {
      name = rev.data.errorName;
      args = rev.data.args ?? [];
    } else {
      const m = /0x[0-9a-fA-F]{8,}/.exec(err.message);
      if (m) data = m[0] as `0x${string}`;
    }
  } else if (typeof err === "string" && err.startsWith("0x")) {
    data = err as `0x${string}`;
  } else if (err && typeof err === "object" && "data" in err && typeof (err as { data: unknown }).data === "string") {
    data = (err as { data: `0x${string}` }).data;
  }
  if (!name && data) {
    try {
      const d = decodeErrorResult({ abi: ALL_ABI, data });
      name = d.errorName;
      args = d.args ?? [];
    } catch {}
  }
  if (name && MESSAGES[name]) return MESSAGES[name](args);
  if (name) return `Transaction reverted: ${name}`;
  if (err instanceof BaseError) return err.shortMessage;
  if (err instanceof Error) return err.message;
  return "Transaction failed";
}
