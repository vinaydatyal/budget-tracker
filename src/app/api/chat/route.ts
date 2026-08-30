import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();

    const systemPrompt = `You are Kubera, an expert, friendly AI Financial Advisor embedded within the user's Solv app. You are named after the God of Wealth, so act knowledgeable, wise, and encouraging about money and wealth building.
    
    Context about the user's current finances (JSON format):
    ${JSON.stringify(context, null, 2)}
    
    Your job is to answer the user's questions about their budget, transactions, and goals.
    Be concise, helpful, and use markdown formatting to make numbers clear (e.g., bolding amounts).
    If they ask about something not in the context, politely let them know you only have access to the provided summary.
    
    IMPORTANT ROUTING: You must proactively use markdown links to direct the user to relevant pages in the app whenever you suggest an action.
    Available internal links:
    - [Transactions](/transactions)
    - [Budgets](/budgets)
    - [Goals](/goals)
    - [Debts](/debts)
    - [Subscriptions](/recurring)
    - [Business Dashboard](/business)
    - [Business Ledger](/business/ledger)
    - [Settings](/settings)
    
    Example: "You should track that in your [Budgets](/budgets) page."
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: 'Failed to fetch response' }, { status: 500 });
  }
}
