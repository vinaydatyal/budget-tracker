# Developer Notes

Welcome to Solv! This document outlines the technical architecture, data flow, and the core financial model used in this application to help future developers easily jump in and contribute.

## 1. Tech Stack & Architecture

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** CSS variables and inline styles with standard utility classes. We use CSS variables heavily for the design system (e.g., `var(--bg-main)`, `var(--accent)`).
- **Icons:** `lucide-react`
- **Charts:** `recharts` for visual data representation.
- **State Management:** Custom React Context API (`AppContext.tsx`) with a built-in reducer.

## 2. State Management & Data Persistence

All state is centrally managed inside `src/context/AppContext.tsx`.
- The `AppState` interface defines the entire universe of user data (Accounts, Transactions, Categories, Goals, Debts, Subscriptions, Ledger, Business Settings).
- **Persistence:** State is persisted to the browser's `localStorage` via a debounced `useEffect` hook. If a user is signed in via Google Auth, the state is simultaneously backed up to Firebase Cloud Firestore via the `useSync` logic.
- **Reducer Pattern:** All mutations to the global state must flow through the `appReducer`.

## 3. The Core Financial Engine

This app employs a simplified "Ledger" or modified Double-Entry Accounting model to provide highly accurate Net Worth and Cash Flow metrics.

### 3.1. Accounts and Liquid Cash
- **Accounts** act as cash buckets (Checking, Credit Card). They can be flagged with `isBusiness: true` to separate freelancer/company funds from personal funds.
- Account balances are **not stored statically**; they are derived dynamically by summing up all historical `Transactions` tied to that account (or synced automatically from real banks).
- **Liquid Net Worth** = `Sum of Positive Accounts (Assets)` - `Sum of Negative Accounts (Liabilities)`.

### 3.2. Wealth Modules (Savings Goals & Debts)
To track long-term wealth, the app separates Goals and Debts from immediate cash flow:
- **Savings Goals:** Track invested/saved money. The current balance is tracked as `currentAmount`. In the Net Worth calculation, these are considered **Assets**.
- **Debts:** Track outstanding loans/mortgages. The current balance is tracked as `balance`. In the Net Worth calculation, these are considered **Liabilities**.
- **Total Net Worth** = `Liquid Net Worth` + `Savings Goals` - `Debts`.

### 3.3. Subscriptions, SIPs, and EMIs
Recurring transactions are managed in a separate collection but strictly interact with the transaction ledger:
- **Standard Subscriptions (Netflix, Rent):** Tracked as `expense`. Reduces Net Worth.
- **SIPs (Systematic Investment Plans):** Tracked as `expense` from the source account but linked to a Savings Goal via `linkedSavingsGoalId`. This decreases Liquid Cash but increases Savings Goal Assets, keeping Net Worth stable (Wealth Transfer).
- **EMIs (Equated Monthly Installments):** Tracked as `expense` but linked to a Debt via `linkedDebtId` (or the `isEmi` flag). This decreases Liquid Cash but also decreases Debt Liabilities, keeping Net Worth stable.

*Note: The `IncomeExpenseChart.tsx` auto-detects SIPs and EMIs via ID linkages or heuristic text matching (regex on keywords like "SIP", "EMI", "Loan") to plot them correctly as "Wealth Transfers" rather than pure "Sunk Costs".*

## 4. The Background Auto-Generator

Inside `AppContext.tsx`, a background engine runs on initialization to process recurring transactions.
- It checks `nextDueDate` against the current date.
- If a recurring payment is due, it pushes a new `Transaction` into the ledger and increments the `nextDueDate` by the specified frequency.
- For EMIs, it increments the `paidInstallments` count. Once `paidInstallments >= totalInstallments`, the subscription is marked as inactive (`active = false`).

## 5. UI & Styling Conventions

- The app uses a highly customized, glassmorphism-inspired dark mode theme defined in `src/app/globals.css`.
- Cards are wrapped in `.card` and use backdrop blurs and subtle borders.
- **Color Coding:** 
  - `var(--income)` is strictly used for positive cash flow and wealth building.
  - `var(--expense)` is used for sunk costs, warnings, and negative balances.
- Chart tooltips and legends are heavily customized to match the premium dark theme.
- Chart tooltips and legends are heavily customized to match the premium dark theme.

## 6. Auto-Labelling Engine (Categorization)

Inside `TransactionForm.tsx`, an auto-labelling engine predicts the transaction Category and Type based on the `description` input.
- **Historical Scanning:** It first scans `state.transactions` for a past transaction with the exact same description. If found, it mimics the category and type of that past entry.
- **Keyword Dictionary:** If no historical match is found, it falls back to a hardcoded dictionary (`merchantKeywords`) containing common merchants (e.g., "Uber", "Starbucks", "Salary").
- **Manual Override:** If the user manually changes the Type or Category, a `manualOverride` flag is set to `true`, instantly pausing the auto-labelling engine for that session so it doesn't fight the user.

## 7. Advanced Logic & "Add-On" Architecture

To keep the UI clean, advanced features are hidden behind an Add-On architecture governed by `state.preferences`.
- **Business Hub:** If `preferences.enableBusinessMode` is true, the app supports tracking freelancer/business finances completely parallel to personal finances. Accounts and categories can be tagged with `isBusiness: true`. A separate `/business` dashboard is revealed, and global filters appear across the app to view "Personal", "Business", or "All" transactions.
- **Envelope Budgeting:** If `preferences.enableEnvelopeBudgeting` is true, the `BudgetsPage` forces all spend goals to use Rollover logic (unspent funds from previous months carry over to the current month).
- **Auto-Cover Overspending:** If `preferences.autoCoverOverspending` is true, the `BudgetsPage` calculates the total surplus from under-spent categories and visually uses it to cover deficits in overspent categories.
- **Predictive Forecasting:** The `ForecastChart.tsx` widget on the dashboard predicts Net Worth up to 6 months into the future by combining the "baseline burn rate" (average income/expense from the last 90 days, excluding recurring) with the exact upcoming schedule of `RecurringTransactions`.
- **Debt Simulator:** If `preferences.enableDebtSimulator` is true, a full Avalanche/Snowball mathematical simulator is revealed on the Debts page.

## 7. API Integrations

### Currency Conversion
- Uses `exchangerate-api.com` to fetch live rates for multi-currency transactions.
- The `TransactionForm` seamlessly converts foreign amounts to the user's base currency inline.

### NLP Smart Add & Receipt Scanning
- Uses OpenRouter API to parse natural language transaction inputs into structured JSON.
- **OpenRouter API Key:** `process.env.OPENROUTER_API_KEY` (Model: `openai/gpt-4o-mini`)
- **Vision/Receipt Parsing:** If the user uploads an image, it is uploaded to Firebase Storage (for CDN hosting). The download URL is passed to OpenRouter's vision model to extract merchants, totals, and tax blocks.
- If the OpenRouter API fails or runs out of credits, the system will fall back to basic client-side heuristics.

### ICICI Bank API Sync
- The application connects to ICICI Bank UAT API to live-sync account balances.
- **Endpoint:** `https://apigwuat.icicibank.com:8443/api/v1/check-balance?type=SB/CC`
- **API Key:** `3bf219ef-9edb-46c4-b41f-d42bac047c10`
- To prevent CORS issues, requests are proxied securely through the Next.js API route `src/app/api/icici/balance/route.ts`.
- The proxy has a fallback mock-data generator built-in so that if the UAT server is down/unreachable from Vercel, the application still works gracefully.

### AI Chat Advisor
- Embeds a floating Chat widget on the Dashboard (`AiAdvisorChat.tsx`).
- Proxies requests through `src/app/api/chat/route.ts`.
- Passes a highly-minified, stringified JSON subset of the user's `AppState` directly into the system prompt to give the LLM real-time context about the user's finances.

### Professional Accountant Exports
- Uses `papaparse` utility (`src/lib/export.ts`) to instantly generate multi-file CSV zip packets.
- Automatically structures the `AppState.ledger` arrays into traditional Double-Entry T-account formats for tax seasons.

## 8. Completed Project Phases
- **Phase 1 & 2:** Core UI, Reducer State, NLP Chat parsing, Multi-Currency.
- **Phase 3:** Business Hub, Advanced Ledger (Double Entry Auto-generation logic inside AppContext), Drag & Drop Dashboards.
- **Phase 4:** Receipt Scanning (Firebase Storage + Vision LLM), AI Insights Dashboard Widget.
- **Phase 5:** True Cloud Syncing (Firestore), PWA Configuration (manifest + service worker), ICICI Bank UAT Sync, AI Chat Advisor.
- **Phase 6 (Rebrand & UI Polish):** Rebranded to "Solv" with the "SV" heart logo. Overhauled the Shared Expenses UI to include visual progress bars and avatars.
- **Phase 7 (Partial Settlements):** Implemented logic to allow partial repayments on IOUs (`settledAmount` tracking) and added an intelligent offset auto-categorization system to generate exact inverse income transactions to keep net-worth reports flawless.

## 9. Where to Find Things

- `src/lib/types.ts`: The central definition of all interfaces. If you add a new field to the database, add it here.
- `src/context/AppContext.tsx`: The brain. Contains the reducer, the local storage sync, and the background recurring engine.
- `src/components/dashboard/`: Contains all the top-level metric widgets (`NetWorthCard`, `IncomeExpenseChart`, etc.).
- `src/app/recurring/page.tsx`: The subscriptions hub. Contains complex filtering logic for determining "True Monthly Cost" vs "Wealth Transfers".

---

## 10. Maintainer Guidelines

**CRITICAL RULE:** This document is considered a living architectural map. Whenever new add-ons, core features, or data models are introduced to the app, this document *must* be updated simultaneously to reflect those changes.
