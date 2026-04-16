import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        // ① ユーザー作成 or 取得
        const dbUser = await prisma.user.upsert({
          where: { email: user.email! },
          update: {},
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
          },
        });

        // ② ルームに参加（ここ追加）
        await prisma.userRoom.upsert({
          where: {
            userId_roomId: {
              userId: dbUser.id,
              roomId: "room1", // とりあえず
            },
          },
          update: {},
          create: {
            userId: dbUser.id,
            roomId: "room1",
          },
        });
        await prisma.userRoom.upsert({
          where: {
            userId_roomId: {
              userId: dbUser.id,
              roomId: "room2",
            },
          },
          update: {},
          create: {
            userId: dbUser.id,
            roomId: "room2",
          },
        });
        return true;
      } catch (e) {
        console.error(e);
        return true; // とりあえずログインは通す
      }
    },

    async session({ session }) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
      });

      if (dbUser) {
        session.user.id = dbUser.id; // ← 重要
      }

      return session;
    },
  },
  // callbacks: {
  //   async signIn() {
  //     return true;
  //   },

  //   async session({ session }) {
  //     return session;
  //   },
  // },
});

export { handler as GET, handler as POST };
