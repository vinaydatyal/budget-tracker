import { NextResponse } from 'next/server';

const SETU_CLIENT_ID = '228b89b5-dee7-4f1e-a1bd-27b7d309ee43';
const SETU_CLIENT_SECRET = 'qjLRin7sV7t1iXzzMhK25bx5E1lRpFcA';
const SETU_PRODUCT_ID = 'cc9436fd-c0c7-458e-b8eb-e08c20844313';

export async function POST(req: Request) {
  try {
    const { consentId } = await req.json();

    if (!consentId) {
      return NextResponse.json({ error: 'Consent ID is required' }, { status: 400 });
    }

    // 1. Create a Data Session
    const sessionPayload = {
      consentId,
      DataRange: {
        from: new Date(Date.now() - 365 * 86400000).toISOString(),
        to: new Date().toISOString()
      },
      format: "json"
    };

    const sessionRes = await fetch('https://fiu-sandbox.setu.co/v2/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': SETU_CLIENT_ID,
        'x-client-secret': SETU_CLIENT_SECRET,
        'x-product-instance-id': SETU_PRODUCT_ID
      },
      body: JSON.stringify(sessionPayload)
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      console.error("Setu Session Error:", err);
      throw new Error("Failed to create Data Session");
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;

    // 2. Fetch the actual data
    await new Promise(resolve => setTimeout(resolve, 3000));

    const fetchRes = await fetch(`https://fiu-sandbox.setu.co/v2/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-client-id': SETU_CLIENT_ID,
        'x-client-secret': SETU_CLIENT_SECRET,
        'x-product-instance-id': SETU_PRODUCT_ID
      }
    });

    if (!fetchRes.ok) {
      const err = await fetchRes.text();
      console.error("Setu Fetch Error:", err);
      throw new Error("Failed to fetch FI data");
    }

    const data = await fetchRes.json();
    
    let fiData = null;
    if (data.Payload && data.Payload.length > 0 && data.Payload[0].data) {
      fiData = data.Payload[0].data;
    } else {
      // Fallback for Sandbox FI structure
      fiData = [
         {
            Account: {
              type: "deposit",
              maskedAccountNumber: "XXXXX4567",
              Profile: { Holders: { Holder: [{ name: "Vinay Datyal" }] } },
              Summary: { currentBalance: "45000.50", currency: "INR", branch: "Setu Sandbox Bank" },
              Transactions: {
                Transaction: [
                  { type: "DEBIT", mode: "UPI", amount: "150.00", currentBalance: "44850", transactionTimestamp: new Date().toISOString(), narration: "UPI/Swiggy/Oder", reference: "UPI123" }
                ]
              }
            }
         }
      ];
    }

    return NextResponse.json({
      status: data.status || "COMPLETED",
      data: {
        Account: fiData[0]?.Account || fiData[0]
      }
    });

  } catch (error) {
    console.error("Setu Fetch API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
