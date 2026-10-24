"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useContract, useDeployments } from "@/lib/contracts";
import { decodeRevert } from "@/lib/errors";
import type { MarketListing } from "@/lib/market";
import { Modal } from "./Modals";
import { useToast } from "./Toast";

export function BuyModal({ listing, onClose }: { listing: MarketListing; onClose: () => void }) {
  const market = useContract("Marketplace");
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("100");
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const rcpt = useWaitForTransactionReceipt({ hash });
  const toast = useToast();
  const n = BigInt(amount || "0");
  const total = n * BigInt(listing.price_per_unit_wei);
  if (rcpt.isSuccess && hash) {
    toast.push({ title: "Purchase confirmed", body: `${amount} tCO2e of ${listing.project_name} · vintage ${listing.vintage}`, kind: "success" });
    onClose();
  }
  return (
    <Modal title={`Buy ${listing.project_name ?? `project #${listing.project_id}`} · ${listing.vintage}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div><span className="label">Price per tonne</span><div className="mono">{formatEther(BigInt(listing.price_per_unit_wei))} ETH</div></div>
          <div><span className="label">Available</span><div className="mono">{listing.amount_left.toLocaleString()} tCO2e</div></div>
        </div>
        <label>
          <span className="label">Tonnes to buy</span>
          <input className="input mono" value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
        <div className="rounded-md px-3 py-2" style={{ background: "var(--surface-2)" }}>Total <b className="mono">{formatEther(total)} ETH</b> on Base Sepolia (testnet), settled into escrow; the seller withdraws later.</div>
        {error && <div className="text-xs" style={{ color: "var(--red)" }}>{decodeRevert(error)}</div>}
        {hash && <div className="text-xs mono break-all">tx {hash} {rcpt.isLoading ? "…" : ""}</div>}
        <button className="btn btn-primary" disabled={!isConnected || !market || isPending || n === 0n || n > BigInt(listing.amount_left)} onClick={() => market && writeContract({ ...market, functionName: "buy", args: [BigInt(listing.id), n], value: total })}>
          {isPending ? "Confirm in wallet…" : `Buy ${amount || 0} tonnes`}
        </button>
        {!isConnected && <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Connect a wallet on Base Sepolia to buy.</div>}
      </div>
    </Modal>
  );
}

export function SellModal({ tokenId, max, projectName, vintage, onClose }: { tokenId: bigint; max: bigint; projectName: string; vintage: number; onClose: () => void }) {
  const market = useContract("Marketplace");
  const credit = useContract("VeriCredit");
  const { address } = useAccount();
  const [amount, setAmount] = useState(String(max));
  const [price, setPrice] = useState("0.0002");
  const approved = useReadContract({ ...(credit ?? { abi: [], address: undefined }), functionName: "isApprovedForAll", args: [address ?? "0x0000000000000000000000000000000000000000", market?.address ?? "0x0000000000000000000000000000000000000000"], query: { enabled: !!credit && !!market && !!address, refetchInterval: 3000 } });
  const approve = useWriteContract();
  const list = useWriteContract();
  const rcpt = useWaitForTransactionReceipt({ hash: list.data });
  const toast = useToast();
  if (rcpt.isSuccess && list.data) {
    toast.push({ title: "Listed for sale", body: `${amount} tCO2e of ${projectName} · ${vintage} at ${price} ETH/t`, kind: "success" });
    onClose();
  }
  const isApproved = approved.data === true;
  return (
    <Modal title={`Sell ${projectName} · ${vintage}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        <label><span className="label">Tonnes to list (you hold {max.toString()})</span><input className="input mono" value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} /></label>
        <label><span className="label">Price per tonne (ETH)</span><input className="input mono" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Credits move into the marketplace escrow until sold or cancelled. A 1% fee goes to the protocol treasury on each sale.</div>
        {(approve.error || list.error) && <div className="text-xs" style={{ color: "var(--red)" }}>{decodeRevert(approve.error ?? list.error)}</div>}
        {!isApproved ? (
          <button className="btn btn-ghost" disabled={!credit || !market || approve.isPending} onClick={() => credit && market && approve.writeContract({ ...credit, functionName: "setApprovalForAll", args: [market.address, true] })}>
            {approve.isPending ? "Confirm in wallet…" : "1 · Allow the marketplace to escrow your credits"}
          </button>
        ) : (
          <button className="btn btn-primary" disabled={!market || list.isPending || !amount || BigInt(amount || "0") === 0n} onClick={() => market && list.writeContract({ ...market, functionName: "list", args: [tokenId, BigInt(amount), parseEther(price || "0")] })}>
            {list.isPending ? "Confirm in wallet…" : "2 · List for sale"}
          </button>
        )}
      </div>
    </Modal>
  );
}

export function WithdrawProceeds() {
  const market = useContract("Marketplace");
  const { address } = useAccount();
  const pending = useReadContract({ ...(market ?? { abi: [], address: undefined }), functionName: "pendingWithdrawals", args: [address ?? "0x0000000000000000000000000000000000000000"], query: { enabled: !!market && !!address, refetchInterval: 5000 } });
  const { writeContract, isPending, error } = useWriteContract();
  const { data: fee } = useDeployments();
  const amt = (pending.data as bigint | undefined) ?? 0n;
  if (!address) return null;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div>
        <div className="label">Sale proceeds waiting for you</div>
        <div className="mono text-xl">{formatEther(amt)} ETH</div>
        <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Protocol fee {Number(fee?.params.marketFeeBps ?? 100) / 100}% per sale.</div>
        {error && <div className="text-xs" style={{ color: "var(--red)" }}>{decodeRevert(error)}</div>}
      </div>
      <button className="btn btn-primary" disabled={!market || amt === 0n || isPending} onClick={() => market && writeContract({ ...market, functionName: "withdraw" })}>
        {isPending ? "Confirm in wallet…" : "Withdraw"}
      </button>
    </div>
  );
}
