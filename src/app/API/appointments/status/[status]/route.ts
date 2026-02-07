import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> }
) {
  try {
    const { status } = await params;
    console.log(`[API Route] Fetching appointments with status: ${status}`);
    console.log(`[API Route] API_BASE_URL: ${API_BASE_URL}`);
    console.log(`[API Route] Full URL: ${API_BASE_URL}/appointments/status/${status}`);
    
    const response = await fetch(`${API_BASE_URL}/appointments/status/${status}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`[API Route] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route] Backend error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`[API Route] Successfully fetched ${Array.isArray(data) ? data.length : 0} appointments`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch appointments', message: error.message },
      { status: 500 }
    );
  }
}
