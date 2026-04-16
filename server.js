const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("🟢 connected:", socket.id);
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("send_message", (data) => {
      io.to(data.roomId).emit("receive_message", data);
    });
  });

  httpServer.listen(3000, () => {
    console.log("🚀 ready on http://localhost:3000");
  });
});
