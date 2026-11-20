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
- **Persistence:** Completely eliminated Google Drive dependency and 1-hour session token timeouts. State is persisted locally to browser `localStorage` and backed up directly to Firebase Cloud Firestore (`users/{userId}` via `src/lib/firestoreSync.ts`) whenever a user signs in. Firebase Auth refreshes tokens seamlessly in the background forever, ensuring permanent, uninterrupted multi-user cloud storage.
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

### Model Context Protocol (MCP) Server for Claude Desktop & Remote Web Connectors
- Provides a comprehensive, production-grade Model Context Protocol (MCP) server with dual transports:
  1. **Remote Cloud Connector Endpoint (`/api/mcp`):** Native Next.js API route supporting both Server-Sent Events (SSE) and direct JSON-RPC HTTP requests. Allows connecting directly from web-based Claude Connectors, claude.ai, mobile apps, or custom AI clients using the live URL: `https://budget-tracker-enterprise.vercel.app/api/mcp`.
  2. **Local Stdio Script (`mcp-server/index.mjs`):** Built with `@modelcontextprotocol/sdk` and `zod` for local command line / Claude Desktop usage.
- **Production Integration:** Configured to sync with the live production web app `https://budget-tracker-enterprise.vercel.app` via `BUDGET_APP_URL`.
- **Data Persistence & Store:** Supports dual-mode persistence (`/tmp/app_state.json` on Vercel, `data/app_state.json` locally, and optional Upstash/Vercel Redis KV when `KV_REST_API_URL` is set).
- **30 Available Tools:** Defined and shared in `src/lib/mcpTools.ts`.
  - *Transactions:* `add_transaction`, `add_transactions_bulk`, `get_transactions`, `update_transaction`, `delete_transaction`.
  - *Accounts:* `list_accounts`, `add_account`, `update_account`, `delete_account`.
  - *Categories:* `list_categories`, `add_category`, `update_category`, `delete_category`.
  - *Budgets:* `list_budget_goals`, `set_budget_goal`, `delete_budget_goal`.
  - *Recurring & Bills:* `list_recurring`, `add_recurring`, `mark_recurring_paid`, `delete_recurring`.
  - *Debts & Loans:* `list_debts`, `add_debt`, `record_debt_payment`, `delete_debt`.
  - *Savings Goals:* `list_savings_goals`, `add_savings_goal`, `contribute_savings_goal`, `delete_savings_goal`.
  - *Intelligence & Analytics:* `get_financial_overview` (executive dashboard with Net Worth, liquid cash, monthly cash flow, alerts), `get_category_spending`.
- **Bidirectional Real-time Synchronization:**
  - Next.js exposes `GET /api/sync` and `POST /api/sync`.
  - When the browser initializes, it reconciles local storage with `data/app_state.json`.
  - Debounced auto-save pushes mutations from the browser to the server file.
  - A window focus listener (`focus`) in `AppContext.tsx` automatically detects when Claude has written new transactions via MCP in the background, updating the UI immediately with a toast notification.
- **Installer & Configuration:**
  - `scripts/install-claude-mcp.js` (or `npm run setup:mcp`) automatically locates Claude's configuration file (`%APPDATA%\Claude\claude_desktop_config.json`) and registers the MCP server.
  - Automated integration test suite: `npm run test:mcp` (`scripts/test-mcp.mjs`).

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
- **Phase 8 (Claude Model Context Protocol MCP & Sync Engine):** Created standalone, high-performance MCP server for Claude Desktop with 30 tools to perform every action in the application (single & bulk transaction management, accounts, categories, budgets, recurring bills, debt payments, savings goals, and real-time financial snapshots). Built bidirectional sync engine between Claude Desktop and the web app with focus-triggered auto-updates.
- **Phase 9 (Dedicated Authentication Route & Resilient Financial Insights):**
  - **Login Route (`/login`):** Created dedicated, responsive login page featuring Google OAuth integration, active session inspection, account switching, guest bypass, and security guarantees. Wrapped in `<Suspense>` for optimal static prerendering.
  - **Auth Shell Integration (`AppShell.tsx` & `LandingNavbar.tsx`):** Excluded `/login` from the sidebar dashboard layout for an unencumbered auth experience; added direct "Sign In" CTA on the landing page navbar.
  - **Sidebar Auth Redesign (`Sidebar.tsx`):** Replaced ambiguous `"Cloud Sync"` button with a prominent `"Sign In"` link when logged out, and a rich user badge (initials avatar, email snippet, live green sync dot, and clean Sign Out action) when logged in.
  - **Guest Mode Awareness (`DashboardPage.tsx`):** Added an alert banner for unauthenticated visitors informing them they are in local Guest Mode with a direct action to Sign In to enable cloud sync.
  - **Zero-Error Heuristic Insights (`AiInsightsWidget.tsx` & `/api/insights`):** Built local algorithmic financial heuristics (cash flow surplus/deficit, bill reminders, debt payoff strategy, savings milestones). If AI environment keys (`ANTHROPIC_API_KEY`, etc.) are omitted or remote LLM calls timeout, the widget and API seamlessly fall back to deterministic financial analysis, eliminating all raw `"fetch failed"` or `"internal error"` displays.
- **Phase 10 (Multi-Provider Firebase Authentication & Production Setup):**
  - **Firebase Auth Providers:** Expanded authentication to support both 1-Click Google OAuth and native Firebase Email & Password authentication (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`).
  - **Dual Auth Mode UI (`/login`):** Built clean tabbed interface allowing users without a Google account to create a password-protected account directly with their email.
  - **Firebase Production Checklist:** Documented Firestore security rules (`users/{userId}` user isolation), Authorized Domains configuration for Vercel, and Cloud Firestore provisioning requirements.
- **Phase 11 (Dedicated New User Initialization & Firestore User Profile Isolation):**
  - **New User Detection (`initOrLoadUser` in `firestoreSync.ts`):** When any user signs in via Google OAuth or Email/Password, checks if `users/{user.uid}` exists in Firestore. If new, initializes a full user profile (`uid`, `email`, `displayName`, `photoURL`, `authProvider: 'google.com'`, `createdAt`, `lastLoginAt`, and a clean `DEFAULT_STATE`).
  - **Per-User Local Cache Partitioning (`storage.ts`):** Keyed browser caching by user ID (`budget_tracker_state_${userId}` vs `budget_tracker_state_guest`), preventing data leakage between guest sessions and different user accounts.
  - **Safe Sign-Out State Reset (`AppContext.tsx`):** On sign-out, resets active memory state to a clean default state so subsequent logins start with pristine, isolated data.
  - **Real-Time 2-Way Sync:** Automatically persists ledger mutations in real time to the authenticated user's Firestore vault (`users/{user.uid}`) with debounced synchronization.
- **Phase 12 (Firebase Passwordless Magic Email Link Authentication):**
  - **Email Link Provider (`AuthContext.tsx`):** Implemented `sendMagicLink` (`sendSignInLinkToEmail`) and `completeMagicLinkSignIn` (`signInWithEmailLink`) using Firebase's modern action code settings.
  - **Auto-Detection in Login UI (`/login`):** Added URL parser to detect incoming verification parameters (`apiKey`, `oobCode`, `mode=signIn`) and auto-authenticate the session into Firestore without requiring passwords.
  - **Zero-Password UX:** Added passwordless link tab to `/login` UI allowing one-click sign in by entering only an email address.
  - **Double-Invocation Guard:** Protected against duplicate `signInWithEmailLink` triggers from React StrictMode/re-renders by debouncing execution with `processedLinkRef` and cleaning URL query parameters (`window.history.replaceState`) immediately upon link consumption to prevent benign `auth/invalid-action-code` error toasts.
  - **Cross-Platform Android Specification:** Outlined Android intent-filter requirements for `budgetpro-c85b5.firebaseapp.com/__/auth/links` to support seamless app-link deep linking in mobile builds.
- **Phase 13 (Live Cloud Firestore Production Deployment & Rule Verification):**
  - **Rules Deployment:** Deployed security rules on Cloud Firestore (`nam5`) enforcing strict user-boundary authorization (`match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }`).
  - **Database Status:** Verified database instance `(default)` in Firebase Console is active with real-time updates enabled.
  - **Real-Time Data Pipeline:** Confirmed client-to-cloud sync pipeline (`initOrLoadUser` and `saveUserCloudState`). User accounts authenticate via Google OAuth or Magic Links, auto-provision user isolation documents under `/users/{uid}`, and continuously sync ledger transactions, budgets, debts, and accounts across all signed-in sessions without session expiration.
- **Phase 14 (Non-Destructive MCP Union Merging & Firestore Auto-Ingestion Bridge):**
  - **The Root Cause:** Claude Desktop's MCP server was writing locally to `data/app_state.json` and posting to Vercel's ephemeral `/api/sync`. When Claude invoked a read tool, `readState()` in `mcp-server/index.mjs` fetched `/api/sync`, where serverless cold-starts or empty browser syncs overwrote custom accounts, custom categories, and budgets with the default 7-account scaffold.
  - **Non-Destructive Union Merging (`/api/sync` & `mcp-server`):** Replaced destructive array overwrites with ID and name union merging. Accounts, categories, budgets, recurring transactions, debts, and savings goals are merged preserving custom entries and preventing default scaffolds from obliterating customized entities.
  - **Firestore Ingestion Bridge (`AppContext.tsx`):** When a user logs in to Firebase and has an empty Firestore profile, the app automatically checks `/api/sync` for records pushed by Claude MCP, ingests them into state, and immediately commits them permanently to Cloud Firestore (`users/{uid}`).
  - **Debounced Sync Protection:** Guarded browser-to-server sync so an empty authenticated state cannot overwrite `/api/sync` data.
- **Phase 15 (Safe Local Storage Fallback & Login Data Migration Engine):**
  - **First-Time Sign-In Data Preservation (`initOrLoadUser` in `firestoreSync.ts`):** Resolved the flaw where a newly authenticated Firebase user was unconditionally seeded with `DEFAULT_STATE`. `initOrLoadUser` now accepts `localFallbackState`; if the cloud profile is new or has 0 transactions, it migrates pre-existing local transactions directly into the user's Firestore vault (`users/{uid}`) instead of wiping them.
  - **Cascading Local Storage Key Recovery (`storage.ts`):** `loadState(userId)` now inspects `budget_tracker_state_${userId}`, `budget_tracker_state_guest`, and legacy `budget_tracker_state`. If the user-specific storage key is empty, it recovers rich data from guest/legacy keys to prevent accidental data loss during guest-to-authenticated transitions.

## 9. Where to Find Things

- `src/lib/types.ts`: The central definition of all interfaces. If you add a new field to the database, add it here.
- `src/context/AppContext.tsx`: The brain. Contains the reducer, the local storage sync, and the background recurring engine.
- `src/components/dashboard/`: Contains all the top-level metric widgets (`NetWorthCard`, `IncomeExpenseChart`, etc.).
- `src/app/recurring/page.tsx`: The subscriptions hub. Contains complex filtering logic for determining "True Monthly Cost" vs "Wealth Transfers".

---

## 10. Maintainer Guidelines

**CRITICAL RULE:** This document is considered a living architectural map. Whenever new add-ons, core features, or data models are introduced to the app, this document *must* be updated simultaneously to reflect those changes.
