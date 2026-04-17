import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { myUserId, targetUserId } = await req.json();

  // 既存room探す
  const existingRoom = await prisma.room.findFirst({
    where: {
      users: {
        every: {
          userId: {
            in: [myUserId, targetUserId],
          },
        },
      },
    },
    include: { users: true },
  });

  if (existingRoom && existingRoom.users.length === 2) {
    return NextResponse.json(existingRoom);
  }

  // なければ作る
  const newRoom = await prisma.room.create({
    data: {
      name: "DM",
      users: {
        create: [{ userId: myUserId }, { userId: targetUserId }],
      },
    },
  });

  return NextResponse.json(newRoom);
}
