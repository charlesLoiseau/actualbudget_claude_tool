// agent/index.js
// The main agent entry point.
// Runs a conversation loop with Claude, which uses tools to interact
// with your Actual Budget data.

import Anthropic from "@anthropic-ai/sdk";
import readline from "readline";
import * as dotenv from "dotenv";
import { initActual, shutdownActual } from "../tools/actual-client.js";
import { toolSchemas, executeTool } from "../tools/definitions.js";

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a helpful personal finance assistant with direct access to the user's Actual Budget data.

You can help them:
- View account balances and transaction history
- Understand their spending patterns
- Log new transactions
- Review and adjust monthly budgets
- Get insights and summaries about their finances

When answering questions:
- Always fetch fresh data using the available tools rather than guessing
- Present monetary amounts clearly with currency symbols
- Be concise but insightful — highlight things the user should pay attention to
- When listing many items, summarize rather than dump raw data
- If the user asks to do something, confirm before making changes (add transaction, set budget)

Today's date: ${new Date().toISOString().split("T")[0]}`;


async function runAgentTurn(messages) {
  /**
   * Run one turn of the agentic conversation loop:
   * 1 Send the conversation history to Claude, along with tool definitions.
   * 2 If Claude responds with a tool call, execute it and send the results back.
   */
  let response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: toolSchemas,
    messages,
  });

  // Agentic loop: keep going while Claude wants to use tools
  while (response.stop_reason === "tool_use") {
    const assistantMessage = { role: "assistant", content: response.content };
    messages.push(assistantMessage);

    // Execute all tool calls in this response
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Send tool results back to Claude
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: toolSchemas,
      messages,
    });
  }

  // Extract the final text response
  const finalText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return finalText;
}

async function main() {
  /**
   * Main entry point: initializes the Actual API connection, then starts a conversation loop with the user.
   */
  console.log("Actual Budget Agent €");
  console.log("=====================");
  console.log("Connecting to your Actual Budget server...\n");

  await initActual();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages = [];

  console.log('\nReady! Ask me anything about your budget. Type "exit" to quit.\n');

  const askQuestion = () => {
    rl.question("You: ", async (userInput) => {
      const input = userInput.trim();

      if (!input) return askQuestion();
      if (input.toLowerCase() === "exit") {
        console.log("\nShutting down...");
        await shutdownActual();
        rl.close();
        process.exit(0);
      }

      messages.push({ role: "user", content: input });

      try {
        process.stdout.write("\nAssistant: ");
        const response = await runAgentTurn(messages);
        console.log(response);
        messages.push({ role: "assistant", content: response });
      } catch (err) {
        console.error(`\nError: ${err.message}`);
      }

      console.log(); // blank line
      askQuestion();
    });
  };

  askQuestion();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
