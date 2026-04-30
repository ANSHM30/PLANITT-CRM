import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  ioInstance = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
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
