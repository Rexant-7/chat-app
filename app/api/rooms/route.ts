import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const rooms = await prisma.room.findMany({
      where: {
        users: {
          some: {
            userId: userId || undefined,
          },
        },
      },
      include: {
        users: {
          include: {
            user: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { user: true },
        },
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}

//　ルーム削除
export async function DELETE(req: Request) {
  const { roomId } = await req.json();

  // メッセージ削除
  await prisma.message.deleteMany({
    where: { roomId },
  });
  // 中間テーブル削除
  await prisma.userRoom.deleteMany({
    where: { roomId },
  });
  // ルーム削除
  await prisma.room.delete({
    where: { id: roomId },
  });

  return NextResponse.json({ ok: true });
}
