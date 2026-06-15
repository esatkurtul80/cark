import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ success: true });
  
  // Clear cookies by setting maxAge to 0
  response.cookies.set('store_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  
  return response;
}
