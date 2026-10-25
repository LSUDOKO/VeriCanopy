#!/usr/bin/env node
// stdio <-> Streamable HTTP bridge for the hosted VeriCanopy MCP server. Zero dependencies.
// Reads newline-delimited JSON-RPC from stdin, POSTs each message to the server, writes replies to stdout.
import { createInterface } from "node:readline";

const URL_ = process.env.VERICANOPY_MCP_URL || "https://vericanopy-api.onrender.com/mcp/";
const log = (...a) => process.stderr.write(`[vericanopy-mcp] ${a.join(" ")}\n`);
let session = null;
let queue = Promise.resolve();

async function forward(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { log("ignoring non-JSON line"); return; }
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (session) headers["mcp-session-id"] = session;
  try {
    const res = await fetch(URL_, { method: "POST", headers, body: JSON.stringify(msg) });
    const sid = res.headers.get("mcp-session-id"); if (sid) session = sid;
    if (res.status === 202 || res.status === 204) return; // notification accepted
    const text = await res.text();
    if (!text.trim()) return;
    if ((res.headers.get("content-type") || "").includes("text/event-stream")) {
      for (const block of text.split(/\n\n/)) {
        const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
        if (data) process.stdout.write(data + "\n");
      }
    } else {
      process.stdout.write(text.trim() + "\n");
    }
  } catch (e) {
    log("request failed:", e.message);
    if (msg && msg.id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: `VeriCanopy server unreachable: ${e.message}` } }) + "\n");
  }
}

createInterface({ input: process.stdin }).on("line", (line) => { if (line.trim()) queue = queue.then(() => forward(line)); });
process.stdin.on("end", () => queue.then(() => process.exit(0)));
log(`bridging stdio to ${URL_}`);
