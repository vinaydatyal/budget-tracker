import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    const anthropicWorkspaceId = process.env.ANTHROPIC_WORKSPACE_ID || '';
    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    
    if (!anthropicKey && !openrouterKey) {
      throw new Error("Missing AI API Key in Vercel environment variables. Please add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to your project settings.");
    }
    const { context } = await req.json();

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

    if (anthropicKey) {
      // Use Anthropic API
      const headers: Record<string, string> = {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      };

      if (anthropicWorkspaceId) {
        headers["anthropic-workspace-id"] = anthropicWorkspaceId;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "claude-3-haiku-20240307", // fast and cheap model, perfect for this
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            { role: "user", content: "Generate insights based on the provided context." }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API Error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      reply = data.content?.[0]?.text || "";
    } else {
      // Fallback to OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate insights based on the provided context." }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      reply = data.choices?.[0]?.message?.content || "";
    }
    
    // Clean up markdown block if present
    if (reply.startsWith('```json')) {
      reply = reply.substring(7);
    }
    if (reply.startsWith('```')) {
      reply = reply.substring(3);
    }
    if (reply.endsWith('```')) {
      reply = reply.substring(0, reply.length - 3);
    }
    
    reply = reply.trim();

    return NextResponse.json(JSON.parse(reply));
  } catch (error: any) {
    console.error('Insights API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
