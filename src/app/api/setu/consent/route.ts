import { NextResponse } from 'next/server';

const SETU_CLIENT_ID = '228b89b5-dee7-4f1e-a1bd-27b7d309ee43';
const SETU_CLIENT_SECRET = 'qjLRin7sV7t1iXzzMhK25bx5E1lRpFcA';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const payload = {
      Detail: {
        consentStart: new Date().toISOString(),
        consentExpiry: new Date(Date.now() + 180 * 86400000).toISOString(),
        Customer: { id: `${phone}@finvu` },
        FIDataRange: {
          from: new Date(Date.now() - 365 * 86400000).toISOString(),
          to: new Date().toISOString()
        },
        consentMode: "STORE",
        consentTypes: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
        fetchType: "ONETIME",
        Frequency: { value: 1, unit: "MONTH" },
        DataFilter: [{ type: "TRANSACTIONAMOUNT", operator: ">=", value: "0" }],
        DataLife: { value: 1, unit: "MONTH" },
        DataConsumer: { id: "FIU" },
        Purpose: {
          Category: { type: "string" },
          code: "101",
          text: "Personal Finance Management",
          refUri: "https://api.rebit.org.in/aa/purpose/101.xml"
        },
        fiTypes: ["DEPOSIT"]
      },
      redirectUrl: "http://localhost:3000/settings" // Setu redirects back here
    };

    const response = await fetch('https://fiu-sandbox.setu.co/v2/consents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': SETU_CLIENT_ID,
        'x-client-secret': SETU_CLIENT_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Setu Consent Error Response:", errText);
      throw new Error(`Setu API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      consentId: data.id,
      url: data.url
    });

  } catch (error) {
    console.error("Setu Consent API Error:", error);
    return NextResponse.json({ error: 'Failed to generate consent' }, { status: 500 });
  }
}
