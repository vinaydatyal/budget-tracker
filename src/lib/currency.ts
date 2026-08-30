const API_KEY = 'bf43377009e82949e8268fb5';
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

// Cache to prevent spamming the API
const rateCache: Record<string, { rates: Record<string, number>, timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const now = Date.now();
  if (rateCache[baseCurrency] && (now - rateCache[baseCurrency].timestamp) < CACHE_DURATION) {
    return rateCache[baseCurrency].rates;
  }

  try {
    const res = await fetch(`${BASE_URL}/latest/${baseCurrency}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch rates: ${res.status}`);
    }
    const data = await res.json();
    if (data.result === 'success') {
      rateCache[baseCurrency] = {
        rates: data.conversion_rates,
        timestamp: now,
      };
      return data.conversion_rates;
    } else {
      throw new Error(`API error: ${data['error-type']}`);
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return empty if fails, caller must handle fallback
    return {};
  }
}

export const COMMON_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
];
