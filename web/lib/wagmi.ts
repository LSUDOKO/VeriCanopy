import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { baseSepolia, foundry, polygonAmoy, sepolia } from "wagmi/chains";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";

export const chains = [foundry, polygonAmoy, baseSepolia, sepolia] as const;
export const activeChain = chains.find((c) => c.id === CHAIN_ID) ?? foundry;

export const wagmiConfig = getDefaultConfig({
  appName: "VeriCanopy",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "vericanopy-local-dev",
  chains: [activeChain, ...chains.filter((c) => c.id !== activeChain.id)],
  transports: {
    [foundry.id]: http(CHAIN_ID === foundry.id ? RPC_URL : undefined),
    [polygonAmoy.id]: http(CHAIN_ID === polygonAmoy.id ? RPC_URL : undefined),
    [baseSepolia.id]: http(CHAIN_ID === baseSepolia.id ? RPC_URL : undefined),
    [sepolia.id]: http(CHAIN_ID === sepolia.id ? RPC_URL : undefined),
  },
  ssr: true,
});

export const NETWORK_LABEL: Record<number, string> = {
  31337: "Anvil (local)",
  80002: "Ethereum Sepolia testnet",
  84532: "Base Sepolia testnet",
  11155111: "Sepolia testnet",
};
