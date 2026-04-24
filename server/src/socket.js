import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("crm:join", (payload = {}) => {
      if (payload.userId) {
        socket.join(`user:${payload.userId}`);
      }

      if (payload.role) {
        socket.join(`role:${payload.role}`);
      }
    });
  });

  return ioInstance;
}

export function getIo() {
  return ioInstance;
}

export function emitCRMEvent(eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
}
