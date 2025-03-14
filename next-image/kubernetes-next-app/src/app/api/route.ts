import { NextResponse } from "next/server";

// To handle a GET request to /api
// eslint-disable-next-line
export async function GET(request: Request) {
  // Do whatever you want
  return NextResponse.json({ message: "Ready!" }, { status: 200 });
}