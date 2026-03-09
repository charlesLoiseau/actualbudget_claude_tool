import * as api from "@actual-app/api";
import fs from "fs";

let initialized = false;

export async function initActual() {
  /**
   * Initialize the API connection. Must be called before any other functions.
   * Reads config from environment variables:
   * - ACTUAL_DATA_DIR: local directory for API data (default: "./data")
   * - ACTUAL_SERVER_URL: URL of the Actual server (e.g. "http://localhost:3000")
   * - ACTUAL_SERVER_PASSWORD: password for the Actual server
   * - ACTUAL_BUDGET_ID: ID of the budget to load (optional, can also be set in .env file)
   */
  if (initialized) return;

  const dataDir = process.env.ACTUAL_DATA_DIR || "./data";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  await api.init({
    dataDir,
    serverURL: process.env.ACTUAL_SERVER_URL,
    password: process.env.ACTUAL_SERVER_PASSWORD,
  });

  await api.downloadBudget(process.env.ACTUAL_BUDGET_ID);
  initialized = true;
  console.log("Connected to Actual API");
}


export async function shutdownActual() {
  /**
   * Cleanly shutdown the API connection.
   */
  if (initialized) {
    await api.shutdown();
    initialized = false;
  }
}

export async function getAccounts() {
  /**
   * Returns a list of accounts with basic info. For balance, use getAccountBalance(accountId) instead.
   * @returns {Promise<Array<{ id: string, name: string, type: string, offbudget: boolean, closed: boolean }>>}
   */
  return await api.getAccounts();
}

export async function getAccountBalance(accountId) {
  const raw = await api.getAccountBalance(accountId);
  return api.utils.integerToAmount(raw);
}

// Categories 
export async function getCategories() {
  return await api.getCategories();
}

export async function getCategoryGroups() {
  return await api.getCategoryGroups();
}

// Transactions

/**
 * Get transactions for an account in a date range.
 * @param {string} accountId
 * @param {string} startDate  "YYYY-MM-DD"
 * @param {string} endDate    "YYYY-MM-DD"
 */
export async function getTransactions(accountId, startDate, endDate) {
  const transactions = await api.getTransactions(accountId, startDate, endDate);
  // Convert internal integer amounts to human-readable floats
  return transactions.map((t) => ({
    ...t,
    amount: api.utils.integerToAmount(t.amount),
  }));
}

/**
 * Add a single transaction.
 * @param {string} accountId
 * @param {{ date: string, amount: number, payee_name: string, notes: string, category_id?: string }} tx
 */
export async function addTransaction(accountId, tx) {
  const transactions = [
    {
      date: tx.date,
      amount: api.utils.amountToInteger(tx.amount),
      payee_name: tx.payee_name,
      notes: tx.notes,
      category_id: tx.category_id || null,
    },
  ];
  return await api.importTransactions(accountId, transactions);
}

// Budget

/**
 * Get the budgeted amount for a category in a given month.
 * @param {string} month  "YYYY-MM"
 * @param {string} categoryId
 */
export async function getBudgetMonth(month) {
  return await api.getBudgetMonth(month);
}

/**
 * Set budget amount for a category in a month.
 * @param {string} month "YYYY-MM"
 * @param {string} categoryId
 * @param {number} amount  (e.g. 200.00)
 */
export async function setBudgetAmount(month, categoryId, amount) {
  await api.setBudgetAmount(month, categoryId, api.utils.amountToInteger(amount));
}

// ActualQL queries

/**
 * Run a raw ActualQL query (advanced use).
 * Example: runQuery(q('transactions').filter({...}).select([...]))
 */
export async function runQuery(query) {
  const { data } = await api.runQuery(query);
  return data;
}

export { api };
