import {
  getAccounts,
  getAccountBalance,
  getCategories,
  getTransactions,
  addTransaction,
  getBudgetMonth,
  setBudgetAmount,
} from "./actual-client.js";

// Schemas 

export const toolSchemas = [
  {
    name: "get_accounts",
    description:
      "List all budget accounts (checking, savings, credit cards, etc.) with their names and IDs.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_account_balance",
    description: "Get the current balance of a specific account.",
    input_schema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "The ID of the account to check.",
        },
      },
      required: ["account_id"],
    },
  },
  {
    name: "get_categories",
    description:
      "List all budget categories (e.g. Groceries, Rent, Entertainment) with their IDs and group names.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_transactions",
    description:
      "Retrieve transactions for an account within a date range. Returns date, payee, category, amount and notes for each transaction.",
    input_schema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "ID of the account to fetch transactions from.",
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format.",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format.",
        },
      },
      required: ["account_id", "start_date", "end_date"],
    },
  },
  {
    name: "add_transaction",
    description:
      "Add a new transaction to an account (e.g. log a purchase or income).",
    input_schema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "ID of the account to add the transaction to.",
        },
        date: {
          type: "string",
          description: "Date of the transaction in YYYY-MM-DD format.",
        },
        amount: {
          type: "number",
          description:
            "Transaction amount. Use negative for expenses (e.g. -45.00), positive for income.",
        },
        payee_name: {
          type: "string",
          description: "Name of the payee or merchant.",
        },
        notes: {
          type: "string",
          description: "Optional notes or memo for the transaction.",
        },
        category_id: {
          type: "string",
          description: "Optional category ID to assign to this transaction.",
        },
      },
      required: ["account_id", "date", "amount", "payee_name"],
    },
  },
  {
    name: "get_budget_month",
    description:
      "Get the full budget for a given month: all categories, their budgeted amounts, spent amounts, and remaining balances.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format (e.g. 2025-03).",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "set_budget_amount",
    description: "Set the budgeted amount for a specific category in a month.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format (e.g. 2025-03).",
        },
        category_id: {
          type: "string",
          description: "ID of the category to budget.",
        },
        amount: {
          type: "number",
          description: "Amount to budget in dollars (e.g. 300.00).",
        },
      },
      required: ["month", "category_id", "amount"],
    },
  },
];

// Tool Handlers

export async function executeTool(toolName, toolInput) {
  console.log(`\nExecuting tool: ${toolName}`);
  console.log(`   Input: ${JSON.stringify(toolInput)}`);

  try {
    let result;

    switch (toolName) {
      case "get_accounts": {
        const accounts = await getAccounts();
        result = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          offbudget: a.offbudget,
          closed: a.closed,
        }));
        break;
      }

      case "get_account_balance": {
        const balance = await getAccountBalance(toolInput.account_id);
        result = { account_id: toolInput.account_id, balance };
        break;
      }

      case "get_categories": {
        const categories = await getCategories();
        result = categories.map((c) => ({
          id: c.id,
          name: c.name,
          group_id: c.group_id,
          hidden: c.hidden,
        }));
        break;
      }

      case "get_transactions": {
        result = await getTransactions(
          toolInput.account_id,
          toolInput.start_date,
          toolInput.end_date
        );
        break;
      }

      case "add_transaction": {
        await addTransaction(toolInput.account_id, {
          date: toolInput.date,
          amount: toolInput.amount,
          payee_name: toolInput.payee_name,
          notes: toolInput.notes || "",
          category_id: toolInput.category_id,
        });
        result = { success: true, message: "Transaction added successfully." };
        break;
      }

      case "get_budget_month": {
        const budget = await getBudgetMonth(toolInput.month);
        // Flatten category groups for easier reading
        const summary = budget.categoryGroups.flatMap((group) =>
          group.categories.map((cat) => ({
            group: group.name,
            category: cat.name,
            category_id: cat.id,
            budgeted: cat.budgeted / 100,
            spent: cat.spent / 100,
            balance: cat.balance / 100,
          }))
        );
        result = { month: toolInput.month, categories: summary };
        break;
      }

      case "set_budget_amount": {
        await setBudgetAmount(
          toolInput.month,
          toolInput.category_id,
          toolInput.amount
        );
        result = {
          success: true,
          message: `Budget set to $${toolInput.amount} for category ${toolInput.category_id} in ${toolInput.month}.`,
        };
        break;
      }

      default:
        result = { error: `Unknown tool: ${toolName}` };
    }

    console.log(`Result: ${JSON.stringify(result).slice(0, 120)}...`);
    return result;
  } catch (err) {
    console.error(`Tool error: ${err.message}`);
    return { error: err.message };
  }
}
