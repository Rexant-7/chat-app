import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { userId, friendId } = await req.json();

  if (!userId || !friendId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const friend = await prisma.friend.create({
      data: {
        userId,
        friendId,
      },
    });

    return NextResponse.json(friend);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "already added?" }, { status: 500 });
  }
}
