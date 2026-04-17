import { Server } from "socket.io";

let io: Server | null = null;

export function initSocket(server: any) {
  if (io) return io;

  io = new Server(server, {
    path: "/api/socket",
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 connected:", socket.id);

    socket.on("send_message", (data) => {
      console.log("📨", data);

      io?.emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("🔴 disconnected:", socket.id);
    });
  });

  return io;
}
