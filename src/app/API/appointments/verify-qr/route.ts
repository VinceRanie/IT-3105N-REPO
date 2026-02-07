import { NextRequest, NextResponse } from 'next/server';

<<<<<<< HEAD
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';
=======
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
>>>>>>> b77e970241954cd12d50a12eaa40733b3fbcec13

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
<<<<<<< HEAD
    const response = await fetch(`${API_BASE_URL}/appointments/verify-qr`, {
=======
    const response = await fetch(`${API_BASE_URL}/api/appointments/verify-qr`, {
>>>>>>> b77e970241954cd12d50a12eaa40733b3fbcec13
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify QR code' },
      { status: 500 }
    );
  }
}
