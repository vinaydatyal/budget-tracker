import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { consentId } = await req.json();

    if (!consentId) {
      return NextResponse.json({ error: 'Consent ID is required' }, { status: 400 });
    }

    // MOCK: Simulate API delay for decrypting data from the FIP
    await new Promise(resolve => setTimeout(resolve, 1500));

    // MOCK: ReBIT (Reserve Bank Information Technology) JSON Schema for Bank Transactions
    const mockData = {
      status: "COMPLETED",
      data: {
        Account: {
          type: "deposit",
          maskedAccountNumber: "XXXXX4567",
          Profile: {
            Holders: {
              Holder: [{ name: "Vinay Datyal" }]
            }
          },
          Summary: {
            currentBalance: "45000.50",
            currency: "INR",
            branch: "HDFC, Bandra"
          },
          Transactions: {
            Transaction: [
              {
                type: "DEBIT",
                mode: "UPI",
                amount: "150.00",
                currentBalance: "44850.50",
                transactionTimestamp: new Date(Date.now() - 86400000).toISOString(),
                narration: "UPI/Swiggy/Oder/Paytm",
                reference: "UPI1234567890"
              },
              {
                type: "CREDIT",
                mode: "NEFT",
                amount: "25000.00",
                currentBalance: "69850.50",
                transactionTimestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                narration: "NEFT/Upwork Escrow Inc/Salary",
                reference: "NEFT987654321"
              },
              {
                type: "DEBIT",
                mode: "UPI",
                amount: "4500.00",
                currentBalance: "65350.50",
                transactionTimestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
                narration: "UPI/Reliance Fresh/Groceries",
                reference: "UPI345678"
              }
            ]
          }
        }
      }
    };

    return NextResponse.json(mockData);

  } catch (error) {
    console.error("Setu Fetch API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
