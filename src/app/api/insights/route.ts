import { NextResponse } from 'next/server';

function generateHeuristicInsights(context: any) {
  const insights: Array<{
    id: string;
    type: 'warning' | 'positive' | 'info';
    iconType: 'alert' | 'trend_up' | 'trend_down' | 'check' | 'sparkle' | 'info';
    title: string;
    text: string;
  }> = [];

  const curr = context?.currency || '₹';
  const spent = Number(context?.recent30DaysActivity?.totalSpent || 0);
  const income = Number(context?.recent30DaysActivity?.totalIncome || 0);

  // 1. Cash flow analysis
  if (income > 0 || spent > 0) {
    if (income >= spent) {
      insights.push({
        id: 'cf-positive',
        type: 'positive',
        iconType: 'trend_up',
        title: 'Net Surplus',
        text: `Your income (${curr}${income.toLocaleString()}) outpaced expenses (${curr}${spent.toLocaleString()}) over the last 30 days by ${curr}${(income - spent).toLocaleString()}.`
      });
    } else {
      insights.push({
        id: 'cf-deficit',
        type: 'warning',
        iconType: 'trend_down',
        title: 'Spending Alert',
        text: `Your 30-day expenses (${curr}${spent.toLocaleString()}) exceeded your recorded income (${curr}${income.toLocaleString()}). Monitor discretionary expenses to maintain savings.`
      });
    }
  }

  // 2. Upcoming recurring bills
  if (context?.upcomingRecurring && context.upcomingRecurring.length > 0) {
    const nextBill = context.upcomingRecurring[0];
    insights.push({
      id: 'recurring-reminder',
      type: 'info',
      iconType: 'sparkle',
      title: 'Upcoming Subscription',
      text: `${nextBill.name} (${curr}${Number(nextBill.amount || 0).toLocaleString()}) is scheduled for ${nextBill.nextDate || 'soon'}. Ensure your account has sufficient balance.`
    });
  }

  // 3. Active Debts
  if (context?.activeDebts && context.activeDebts.length > 0) {
    const highestDebt = [...context.activeDebts].sort((a, b) => Number(b.interestRate || 0) - Number(a.interestRate || 0))[0];
    insights.push({
      id: 'debt-strategy',
      type: 'warning',
      iconType: 'alert',
      title: 'Debt Payoff Focus',
      text: `Prioritize paying down ${highestDebt.name} (Balance: ${curr}${Number(highestDebt.balance || 0).toLocaleString()}) to minimize cumulative interest charges.`
    });
  }

  // 4. Savings goals
  if (context?.savingsGoals && context.savingsGoals.length > 0) {
    const goal = context.savingsGoals[0];
    const progress = Number(goal.progress || 0);
    const target = Number(goal.target || 0);
    const pct = target > 0 ? Math.round((progress / target) * 100) : 0;
    insights.push({
      id: 'savings-milestone',
      type: 'positive',
      iconType: 'check',
      title: 'Savings Progress',
      text: `You have reached ${pct}% of your "${goal.name}" target (${curr}${progress.toLocaleString()} of ${curr}${target.toLocaleString()}). Keep it up!`
    });
  }

  // Fallback if no specific data exists yet
  if (insights.length === 0) {
    insights.push({
      id: 'welcome-solv',
      type: 'info',
      iconType: 'sparkle',
      title: 'Welcome to Solv',
      text: 'Log your transactions using Quick Add (A) to unlock automated personalized financial recommendations.'
    });
    insights.push({
      id: 'cloud-storage-ready',
      type: 'positive',
      iconType: 'check',
      title: 'Cloud Sync Ready',
      text: 'Sign in to automatically sync your ledger in real-time across all your desktop and mobile devices.'
    });
  }

  return insights;
}

export async function POST(req: Request) {
  let context: any = {};
  try {
    const body = await req.json().catch(() => ({}));
    context = body?.context || {};
  } catch {
    context = {};
  }

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    const anthropicWorkspaceId = process.env.ANTHROPIC_WORKSPACE_ID || '';
    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    const hfKey = process.env.HUGGINGFACE_API_KEY || '';
    
    // If no AI key is configured in environment, immediately return heuristic insights
    if (!anthropicKey && !openrouterKey && !hfKey) {
      return NextResponse.json(generateHeuristicInsights(context));
    }

    const systemPrompt = `You are an expert personal financial advisor and AI assistant. 
Your job is to analyze the user's financial context (debts, recurring expenses, milestones, upcoming income) and generate 2-4 highly actionable and personalized notifications/insights for their dashboard.

Rules:
1. Provide insights that are directly useful (e.g., reminding them a loan payment is due soon, warning about high interest debt, celebrating a savings milestone, or alerting them about an upcoming project income).
2. BE SPECIFIC about timeframes. Use the provided \`currentDate\` to calculate exactly when something is due. Do NOT just say "within the next 30 days" - instead say "due tomorrow", "due in 3 days", "due next week", etc.
3. Format the response strictly as a JSON array of objects.
4. Each object must have:
  - id: a unique string
  - type: 'warning' (for alerts/debts), 'positive' (for milestones/income), or 'info' (for general reminders)
  - iconType: 'alert', 'trend_up', 'trend_down', 'check', or 'sparkle'
  - title: a short 2-4 word title
  - text: a concise 1-2 sentence description

Context Provided:
${JSON.stringify(context, null, 2)}

Return ONLY the raw JSON array, without markdown formatting like \`\`\`json.`;

    let reply = "";
    let anthropicFailed = false;
    let openrouterFailed = false;

    // 1. Try Anthropic
    if (anthropicKey) {
      try {
        const headers: Record<string, string> = {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        };

        if (anthropicWorkspaceId) {
          headers["anthropic-workspace-id"] = anthropicWorkspaceId;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              { role: "user", content: "Generate insights based on the provided context." }
            ],
            temperature: 0.3
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          reply = data.content?.[0]?.text || "";
        } else {
          anthropicFailed = true;
        }
      } catch (err: any) {
        console.warn("Anthropic API failed, falling back...", err.message);
        anthropicFailed = true;
      }
    }

    // 2. Try OpenRouter (if Anthropic failed or key is missing)
    if (!reply && (openrouterKey || anthropicFailed)) {
      if (!openrouterKey) {
        openrouterFailed = true;
      } else {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey}`,
              "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate insights based on the provided context." }
              ],
              temperature: 0.3
            })
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            reply = data.choices?.[0]?.message?.content || "";
          } else {
            openrouterFailed = true;
          }
        } catch (err: any) {
          console.warn("OpenRouter API failed, falling back...", err.message);
          openrouterFailed = true;
        }
      }
    }

    // 3. Try Hugging Face (if both Anthropic and OpenRouter failed or are missing)
    if (!reply && (hfKey || openrouterFailed)) {
      if (hfKey) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${hfKey}`,
              "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "meta-llama/Meta-Llama-3-8B-Instruct",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate insights based on the provided context." }
              ],
              temperature: 0.3,
              max_tokens: 1024
            })
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            reply = data.choices?.[0]?.message?.content || "";
          }
        } catch (err: any) {
          console.warn("HF API failed, falling back...", err.message);
        }
      }
    }
    
    // If we have an AI reply, clean it up and parse
    if (reply) {
      if (reply.startsWith('```json')) reply = reply.substring(7);
      if (reply.startsWith('```')) reply = reply.substring(3);
      if (reply.endsWith('```')) reply = reply.substring(0, reply.length - 3);
      reply = reply.trim();

      try {
        const parsed = JSON.parse(reply);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(parsed);
        }
      } catch (parseErr) {
        console.warn("Failed to parse AI insights response as JSON, using fallback", parseErr);
      }
    }

    // Fallback: Return heuristic insights if AI was unavailable or invalid
    return NextResponse.json(generateHeuristicInsights(context));
  } catch (error: any) {
    console.error('Insights API Error, falling back to heuristics:', error);
    return NextResponse.json(generateHeuristicInsights(context));
  }
}
