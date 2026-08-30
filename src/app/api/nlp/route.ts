import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { input, stateContext } = await req.json();

    const systemPrompt = `You are a financial parsing assistant. Your job is to extract transaction details from the user's natural language input and return ONLY a raw JSON object. Do not wrap in markdown blocks like \`\`\`json.
  
Given the user's input, map it to the following properties:
- amount: (number) The amount of money involved.
- description: (string) A short 2-4 word description of the merchant or purpose.
- type: (string) "expense" (spending), "income" (earning), or "transfer" (moving money).
- categoryId: (string) The best matching category ID from the provided list.
- accountId: (string) The best matching source account ID from the provided list.
- toAccountId: (string) Only if type is transfer. The destination account ID.

Accounts available:
${stateContext.accounts}

Categories available:
${stateContext.categories}

Example: "Spent $15 at Starbucks on Credit Card"
Output: {"amount": 15, "description": "Starbucks", "type": "expense", "categoryId": "cat-4b", "accountId": "acc-3"}

Return ONLY the JSON string, nothing else.`;

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
          { role: "user", content: input }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      // console.error("OpenRouter Error Body:", errText);
      throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content.trim();
    
    // Clean up potential markdown formatting that the LLM might have ignored instructions on
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);

  } catch (error: any) {
    // console.warn("NLP API error:", error.message || error);
    return NextResponse.json({ error: 'Failed to parse' }, { status: 500 });
  }
}
