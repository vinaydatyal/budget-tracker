This # Claude MCP Server for Solv (Budget Tracker)

Control your entire financial life directly through Claude! With the **Solv Model Context Protocol (MCP)** server, Claude Desktop and Claude Apps can view, add, update, and manage everything in your budget tracker on your behalf.

---

## 🚀 Quick Setup (Configured for Live Production Web App!)

Your Claude Desktop has already been automatically configured with the MCP server connected directly to your live production web app:
`C:\Users\Digital Leap\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "budget-tracker": {
      "command": "node",
      "args": [
        "C:\\Users\\Digital Leap\\.gemini\\antigravity-ide\\scratch\\budget-tracker\\mcp-server\\index.mjs"
      ],
      "env": {
        "BUDGET_APP_URL": "https://budget-tracker-enterprise.vercel.app"
      }
    }
  }
}
```

### To Activate in Claude Desktop:
1. **Restart Claude Desktop** (Quit Claude completely and open it again).
2. Open a chat in Claude. You will see the **🔌 Tools / Hammer** icon at the bottom of the chat box indicating **30 Solv Tools** are active!
3. You can now chat naturally with Claude about your finances.

---

## ⚡ Live Cloud Synchronization with https://budget-tracker-enterprise.vercel.app

- **Claude ➔ Live Web App**: When Claude creates or updates transactions, accounts, or budgets, the changes are posted directly to your live Vercel app's `/api/sync` endpoint and cached locally in `data/app_state.json`. When you switch back to your browser tab on `https://budget-tracker-enterprise.vercel.app/dashboard`, the UI automatically detects the new transactions on window focus and syncs them!
- **Live Web App ➔ Claude**: Any transactions or accounts you create directly on the web app are automatically synced so Claude always has real-time context.

---

## 💬 Example Prompts You Can Give to Claude

### 1. Adding Single Transactions
> "I just paid ₹1,450 for dinner at Barbeque Nation using my Credit Card. Add it to my budget tracker."
> "I received a ₹1,20,000 salary credited to Main Checking today."
> "Transfer ₹20,000 from Main Checking to Cash Wallet."

### 2. Bulk Importing Statements & SMS Logs
Paste an entire SMS dump or bank statement into Claude and say:
> "Here are the transaction SMS messages from my bank today:
> 1. Spent INR 450.00 at Starbucks via HDFC CC on 17-Nov
> 2. Paid INR 1,200.00 to Shell Petrol via UPI
> 3. Spent INR 3,450.00 at DMart Groceries
> Add all of these into my budget tracker in bulk."

Claude will use `add_transactions_bulk` to insert all of them in a single operation!

### 3. Financial Overview & Net Worth
> "Give me a complete overview of my financial status and current net worth."
> "How much did I spend on Food & Dining this month compared to last month?"
> "What are my upcoming bills in the next 14 days?"

### 4. Setting & Monitoring Budgets
> "Set a monthly budget limit of ₹15,000 for Food & Dining for this month."
> "Check my budget progress. Am I over budget in any category?"

### 5. Managing Recurring Bills & EMIs
> "Add a recurring subscription for Netflix of ₹649 due on the 5th of every month."
> "Mark my Car Loan EMI as paid today."
> "List all my active subscriptions and upcoming bills."

### 6. Loans, Debts & Savings Goals
> "Add a personal loan debt of ₹2,50,000 at 11.5% interest from HDFC Bank."
> "Record a ₹15,000 payment towards my Car Loan from Main Checking."
> "Create a savings goal 'Japan Trip' with a target of ₹1,50,000."
> "Contribute ₹10,000 towards my Japan Trip goal."

### 7. Managing Accounts & Categories
> "Create a new savings account called 'SBI Emergency Account'."
> "Add a new category called 'Gym & Fitness' with icon 🏋️ and a ₹3,000 monthly limit."

---

## 🛠️ Complete Tool Reference (30 Tools)

| Tool Name | Description |
|---|---|
| `add_transaction` | Add an expense, income, or transfer transaction |
| `add_transactions_bulk` | Batch import multiple transactions at once |
| `get_transactions` | Filter transactions by date, category, account, type, or search |
| `update_transaction` | Edit amount, description, date, account, or category of a transaction |
| `delete_transaction` | Delete a transaction (with automatic debt/savings rollback) |
| `list_accounts` | List all accounts with real-time liquid balances |
| `add_account` | Create new checking, savings, credit, or cash account |
| `update_account` | Update account name, asset type, or color |
| `delete_account` | Delete an account |
| `list_categories` | List expense/income categories, icons, and limits |
| `add_category` | Create new category with icon and budget |
| `update_category` | Update category name, icon, or budget |
| `delete_category` | Delete a category |
| `list_budget_goals` | View monthly category budgets vs actual spending |
| `set_budget_goal` | Set or update a monthly category budget limit |
| `delete_budget_goal` | Remove a category budget limit |
| `list_recurring` | List active subscriptions, bills, EMIs, and SIPs |
| `add_recurring` | Add recurring bill, subscription, or EMI |
| `mark_recurring_paid` | Mark a recurring bill as paid & advance next due date |
| `delete_recurring` | Delete a recurring bill or subscription |
| `list_debts` | List loans and credit card debts |
| `add_debt` | Add a new loan or debt balance |
| `record_debt_payment` | Record payment towards a debt & update balance |
| `delete_debt` | Delete a debt entry |
| `list_savings_goals` | List savings goals & progress |
| `add_savings_goal` | Create a new savings target |
| `contribute_savings_goal` | Deposit funds into a savings goal |
| `delete_savings_goal` | Delete a savings goal |
| `get_financial_overview` | Complete snapshot: Net worth, cash flow, accounts, alerts |
| `get_category_spending` | Breakdown of expenses by category with percentages |

---

## 🔧 Useful Commands

- **Run MCP Server standalone**: `npm run mcp`
- **Re-install / verify Claude Desktop config**: `npm run setup:mcp`
- **Run automated test suite**: `npm run test:mcp`
