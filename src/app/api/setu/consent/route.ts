import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // MOCK: Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // MOCK: Generate a fake consent ID and a redirect URL
    const consentId = `cons_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const redirectUrl = `https://mock.setu.co/consent/${consentId}`; // This would be a real Setu URL

    return NextResponse.json({
      success: true,
      consentId,
      url: redirectUrl
    });

  } catch (error) {
    console.error("Setu Consent API Error:", error);
    return NextResponse.json({ error: 'Failed to generate consent' }, { status: 500 });
  }
}
