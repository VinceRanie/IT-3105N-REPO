import { NextRequest, NextResponse } from 'next/server';

<<<<<<< HEAD
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';
=======
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org';
>>>>>>> b77e970241954cd12d50a12eaa40733b3fbcec13

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> }
) {
  try {
    const { status } = await params;
    console.log(`Fetching appointments with status: ${status} from ${API_BASE_URL}`);
    
<<<<<<< HEAD
    const response = await fetch(`${API_BASE_URL}/appointments/status/${status}`, {
=======
    const response = await fetch(`${API_BASE_URL}/api/appointments/status/${status}`, {
>>>>>>> b77e970241954cd12d50a12eaa40733b3fbcec13
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments', message: error.message },
      { status: 500 }
    );
  }
}
