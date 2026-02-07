import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> }
) {
  try {
    const { status } = await params;
    const response = await fetch(`${API_BASE_URL}/api/appointment/status/${status}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
