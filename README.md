# BudgetPro - Advanced Financial Tracker

BudgetPro is a premium, highly interactive personal and business finance tracker built with Next.js, TypeScript, and CSS Variables for a dynamic glassmorphism UI.

## Features

- **Double-Entry Ledger Architecture:** Accurate tracking of Net Worth, Cash Flow, and Assets vs. Liabilities.
- **Business Hub:** A completely parallel "Business Mode" for freelancers and small business owners to track company finances alongside personal ones without commingling the data.
- **Dynamic Dashboard:** A drag-and-drop grid layout with powerful widgets (Net Worth, Insights, Cash Flow Sankey, Upcoming Bills, Balance Forecast).
- **Auto-Labelling Engine:** Predicts transaction categories and types based on historical data and keyword heuristics.
- **Envelope Budgeting:** Optional rollover logic for unused monthly budget funds.
- **Automated Subscriptions & EMIs:** A background engine automatically processes recurring subscriptions, SIPs (wealth transfers), and EMIs (debt payments).
- **Debt & Savings Tracking:** Separate modules for tracking long-term loans and investment goals, integrated natively into the core Net Worth calculation.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS with deep CSS variable theming (Dark Mode)
- **Icons:** Lucide React
- **Charts:** Recharts
- **State Management:** Custom React Context + Reducer with `localStorage` persistence.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Developer Guidelines

Please read `DEVELOPER_NOTES.md` for a comprehensive overview of the data model and advanced architecture before contributing.
