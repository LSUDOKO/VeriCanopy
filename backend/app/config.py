"""Backend settings (09 §6). Values come from `.env` at the repo root or the environment."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = f"sqlite:///{REPO_ROOT / 'data' / 'vericanopy.db'}"
    rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337
    deployments_file: str = ""  # defaults to contracts/deployments/<chain_id>.json
    admin_api_key: str = "change-me"
    ipfs_api_url: str = ""
    ipfs_gateway: str = "https://ipfs.io/ipfs/"
    ipfs_store_dir: str = str(REPO_ROOT / "data" / "ipfs")
    oracle_private_key: str = ""
    keeper_private_key: str = (
        ""  # funded key for permissionless upkeep (finalize); falls back to the oracle key
    )
    pq_secret_key_path: str = str(REPO_ROOT / "secrets" / "ml_dsa_65.sk")
    pq_public_key_path: str = str(REPO_ROOT / "secrets" / "ml_dsa_65.pk")
    zk_mode: str = "onchain"  # onchain | offchain
    indexer_confirmations: int = 5
    indexer_chunk: int = 500
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    explorer_url: str = ""  # e.g. https://amoy.polygonscan.com


settings = Settings()
if not settings.deployments_file:
    settings.deployments_file = str(REPO_ROOT / "contracts" / "deployments" / f"{settings.chain_id}.json")
