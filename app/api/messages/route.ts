import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// メッセージ送信
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, userId, roomId } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { message: "content is required" },
        { status: 400 },
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        userId,
        roomId,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// メッセージ取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerId = searchParams.get("viewerId");
    const roomId = searchParams.get("roomId");

    //既読管理
    if (viewerId) {
      await prisma.message.updateMany({
        where: {
          userId: {
            not: viewerId,
          },
          isRead: false,
          roomId: roomId || undefined,
        },
        data: {
          isRead: true,
        },
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId: roomId || undefined,
      },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
