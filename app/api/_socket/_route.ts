import { NextResponse } from "next/server";
// import { initSocket } from "../../../lib/socket";

export async function GET() {
  // @ts-ignore
  if (!global.io) {
    // @ts-ignore
    global.io = initSocket((global as any).server);
  }

  return NextResponse.json({ ok: true });
}
