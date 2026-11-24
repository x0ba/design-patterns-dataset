// Prints a currently free port on 127.0.0.1: `node free-port.mjs tcp|udp`.
import { createSocket } from "node:dgram";
import { createServer } from "node:net";
if (process.argv[2] === "udp") {
  const socket = createSocket("udp4");
  socket.bind(0, "127.0.0.1", () => { const { port } = socket.address(); socket.close(() => console.log(port)); });
} else {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => { const { port } = server.address(); server.close(() => console.log(port)); });
}
