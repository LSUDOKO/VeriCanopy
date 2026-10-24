"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Deployments } from "./api";
import ProjectRegistry from "./abis/ProjectRegistry.json";
import VeriCredit from "./abis/VeriCredit.json";
import BufferPool from "./abis/BufferPool.json";
import IntegrityOracle from "./abis/IntegrityOracle.json";
import ChallengeManager from "./abis/ChallengeManager.json";
import RetirementRegistry from "./abis/RetirementRegistry.json";
import ModelRegistry from "./abis/ModelRegistry.json";
import PQKeyRegistry from "./abis/PQKeyRegistry.json";
import Marketplace from "./abis/Marketplace.json";
import type { Abi } from "viem";

export const ABIS = {
  ProjectRegistry: ProjectRegistry as Abi,
  VeriCredit: VeriCredit as Abi,
  BufferPool: BufferPool as Abi,
  IntegrityOracle: IntegrityOracle as Abi,
  ChallengeManager: ChallengeManager as Abi,
  RetirementRegistry: RetirementRegistry as Abi,
  ModelRegistry: ModelRegistry as Abi,
  PQKeyRegistry: PQKeyRegistry as Abi,
  Marketplace: Marketplace as Abi,
};
export type ContractName = keyof typeof ABIS;

/** Addresses come from the API (`contracts/deployments/<chainId>.json`), so a redeploy needs no rebuild. */
export function useDeployments() {
  return useQuery({ queryKey: ["deployments"], queryFn: () => api<Deployments>("/deployments"), staleTime: 60_000 });
}

export function useContract(name: ContractName) {
  const { data } = useDeployments();
  const address = data?.contracts[name];
  return address ? ({ address, abi: ABIS[name] } as const) : undefined;
}
