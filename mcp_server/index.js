import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initActual, getAccounts, getTransactions } from "../tools/actual-client.js";

const server = new McpServer({ name: "actual-budget", version: "1.0.0" });

// You register tools on the server — same concept, different API
server.tool(
  "get_accounts",
  "List all budget accounts",
  {},                           // input schema (zod)
  async () => {
    const accounts = await getAccounts();
    return { content: [{ type: "text", text: JSON.stringify(accounts) }] };
  }
);

server.tool(
  "get_transactions",
  "Get transactions for an account",
  { account_id: z.string(), start_date: z.string(), end_date: z.string() },
  async ({ account_id, start_date, end_date }) => {
    const txs = await getTransactions(account_id, start_date, end_date);
    return { content: [{ type: "text", text: JSON.stringify(txs) }] };
  }
);

await initActual();
await server.connect(new StdioServerTransport());