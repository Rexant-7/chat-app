import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json([]);

  const friends = await prisma.friend.findMany({
    where: { userId },
    include: {
      friend: true,
    },
  });

  return NextResponse.json(friends);
}
