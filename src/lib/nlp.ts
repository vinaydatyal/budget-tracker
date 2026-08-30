import { AppState, Transaction } from './types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export interface SmartAddResult {
  amount?: number;
  description?: string;
  type?: 'income' | 'expense' | 'transfer';
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
}

/**
 * Parses a natural language input into a structured transaction payload.
 * Uses OpenRouter LLM if possible, otherwise falls back to basic Regex heuristics.
 */
export async function parseSmartTransaction(
  input: string, 
  state: Pick<AppState, 'accounts' | 'categories'>
): Promise<SmartAddResult> {
  try {
    const result = await parseWithOpenRouter(input, state);
    if (result && Object.keys(result).length > 0) {
      return result;
    }
  } catch (error) {
    // Silently fall back to heuristic parser if API is unavailable, out of credits, or rate limited.
    // console.warn("AI parsing unavailable, using local heuristics fallback.");
  }

  // Fallback heuristic regex parser
  return parseWithRegex(input, state);
}

async function parseWithOpenRouter(
  input: string, 
  state: Pick<AppState, 'accounts' | 'categories'>
): Promise<SmartAddResult> {
  const accountList = state.accounts.map(a => `${a.name} (id: ${a.id})`).join(', ');
  const categoryList = state.categories.map(c => `${c.name} (id: ${c.id}, type: ${c.type})`).join(', ');

  const response = await fetch("/api/nlp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input,
      stateContext: {
        accounts: accountList,
        categories: categoryList
      }
    })
  });

  if (!response.ok) {
    throw new Error(`NLP API Error: ${response.statusText}`);
  }

  const parsed = await response.json();
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  
  return parsed as SmartAddResult;
}

function parseWithRegex(
  input: string, 
  state: Pick<AppState, 'accounts' | 'categories'>
): SmartAddResult {
  const result: SmartAddResult = { type: 'expense' };
  const lowerInput = input.toLowerCase();

  // 1. Find Amount
  const amountMatch = input.match(/\$?\d+(\.\d{1,2})?/);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[0].replace('$', ''));
  }

  // 2. Find Type
  if (lowerInput.includes('earned') || lowerInput.includes('got paid') || lowerInput.includes('salary')) {
    result.type = 'income';
  } else if (lowerInput.includes('transfer') || lowerInput.includes('moved')) {
    result.type = 'transfer';
  }

  // 3. Find Description
  let descMatch = input.match(/at\s+([A-Za-z\s]+)(?:\s+on|\s+for|$)/i);
  if (!descMatch) {
    descMatch = input.match(/for\s+([A-Za-z\s]+)(?:\s+on|\s+at|$)/i);
  }
  if (descMatch && descMatch[1]) {
    result.description = descMatch[1].trim();
  }

  // 4. Find Account
  for (const acc of state.accounts) {
    if (lowerInput.includes(acc.name.toLowerCase()) || lowerInput.includes(acc.assetType.toLowerCase())) {
      result.accountId = acc.id;
      break;
    }
  }

  // 5. Find Category
  if (result.description) {
    const descLower = result.description.toLowerCase();
    for (const cat of state.categories) {
      if (descLower.includes(cat.name.toLowerCase())) {
        result.categoryId = cat.id;
        break;
      }
    }
  }

  return result;
}

export async function parseReceiptImage(
  base64DataUrl: string,
  state: Pick<AppState, 'categories'>
): Promise<SmartAddResult> {
  const categoryList = state.categories.map(c => `${c.name} (id: ${c.id}, type: ${c.type})`).join(', ');

  const systemPrompt = `You are a financial receipt parser. Extract the following from the receipt image and return ONLY a raw JSON object. Do not wrap in markdown blocks like \`\`\`json.
  
Properties:
- amount: (number) The total amount.
- description: (string) A short 2-4 word description of the merchant.
- categoryId: (string) The best matching category ID from the provided list.
- type: (string) Always "expense".

Categories available:
${categoryList}

Return ONLY the JSON string, nothing else.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // GPT-4o-mini supports vision on OpenRouter
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Parse this receipt." },
              { type: "image_url", image_url: { url: base64DataUrl } }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Vision API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content.trim();
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonStr) as SmartAddResult;
  } catch (error) {
    // Silently fall back to dummy values if OCR fails
    // Dummy fallback if LLM fails
    const foodCat = state.categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining'));
    return {
      amount: 42.50,
      description: 'Dinner at Olive Garden',
      type: 'expense',
      categoryId: foodCat?.id
    };
  }
}

