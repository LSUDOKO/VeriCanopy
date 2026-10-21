"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useContract, useDeployments } from "@/lib/contracts";
import { decodeRevert } from "@/lib/errors";
import { API_URL, type Submission } from "@/lib/api";
import { useToast } from "./Toast";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal aria-label={title}>
      <div className="card w-full max-w-lg p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const REASONS = ["WrongGeometry", "WrongDates", "CloudContamination", "BadMatching", "DataTampering", "Other"];

export function ChallengeModal({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const cm = useContract("ChallengeManager");
  const dep = useDeployments();
  const { isConnected } = useAccount();
  const [reason, setReason] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState("");
  const minBond = BigInt(Number(dep.data?.params.minChallengeBond ?? 0));
  const stakeHalf = submission.stake ? BigInt(submission.stake) / 2n : 0n;
  const bond = stakeHalf > minBond ? stakeHalf : minBond;
  const [bondEth, setBondEth] = useState("");
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const rcpt = useWaitForTransactionReceipt({ hash });
  const toast = useToast();

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_URL}/api/v1/evidence`, { method: "POST", body: fd });
    const j = await r.json();
    setCid(j.cid);
    toast.push({ title: "Evidence uploaded", body: j.cid, kind: "success" });
  };

  const submit = () => {
    if (!cm) return;
    writeContract({ ...cm, functionName: "openChallenge", args: [BigInt(submission.id), reason, cid || ""], value: bondEth ? parseEther(bondEth) : bond });
  };

  return (
    <Modal title={`Challenge submission #${submission.id}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        <label>
          <span className="label">Reason</span>
          <select className="input" value={reason} onChange={(e) => setReason(Number(e.target.value))}>
            {REASONS.map((r, i) => (
              <option key={r} value={i}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Evidence (uploaded to the content-addressed store)</span>
          <div className="flex gap-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn btn-ghost" onClick={upload} disabled={!file}>
              Upload
            </button>
          </div>
          <input className="input mt-1 mono" placeholder="or paste a CID" value={cid} onChange={(e) => setCid(e.target.value)} />
        </label>
        <label>
          <span className="label">Bond (min {Number(bond) / 1e18} native)</span>
          <input className="input mono" placeholder={String(Number(bond) / 1e18)} value={bondEth} onChange={(e) => setBondEth(e.target.value)} />
        </label>
        {error && <div className="text-xs" style={{ color: "var(--red)" }}>{decodeRevert(error)}</div>}
        {hash && <div className="text-xs mono break-all">tx {hash} {rcpt.isSuccess ? "✓ confirmed" : "…"}</div>}
        <button className="btn btn-primary" onClick={submit} disabled={!isConnected || !cm || isPending}>
          {isPending ? "Confirm in wallet…" : "Open challenge"}
        </button>
        {!isConnected && <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Connect a wallet to challenge.</div>}
      </div>
    </Modal>
  );
}

export function RetireModal({ tokenId, max, onClose }: { tokenId: bigint; max: bigint; onClose: () => void }) {
  const credit = useContract("VeriCredit");
  const [amount, setAmount] = useState("1");
  const [beneficiary, setBeneficiary] = useState("");
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const rcpt = useWaitForTransactionReceipt({ hash });
  return (
    <Modal title="Retire credits" onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        <label>
          <span className="label">Amount (tCO2e, max {max.toString()})</span>
          <input className="input mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          <span className="label">Beneficiary</span>
          <input className="input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Acme Corp" />
        </label>
        {error && <div className="text-xs" style={{ color: "var(--red)" }}>{decodeRevert(error)}</div>}
        {hash && <div className="text-xs mono break-all">tx {hash} {rcpt.isSuccess ? "✓ retired" : "…"}</div>}
        <button className="btn btn-primary" disabled={!credit || isPending} onClick={() => credit && writeContract({ ...credit, functionName: "retire", args: [tokenId, BigInt(amount || "0"), beneficiary] })}>
          {isPending ? "Confirm in wallet…" : "Retire"}
        </button>
      </div>
    </Modal>
  );
}
