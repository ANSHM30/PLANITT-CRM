import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import {
  addChatGroupMembers,
  clearChatLocal,
  createChatGroup,
  createChatMessage,
  deleteChatGroup,
  deleteChatMessage,
  getChatGroupById,
  getChatGroupMembers,
  getChatMessages,
  getChatRooms,
  markChatRoomRead,
  removeChatGroupMember,
  updateChatGroup,
  uploadChatAttachment,
} from "../controllers/chat.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads/chat");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
      return;
    }
    cb(new Error("Only image and PDF files are allowed."));
  },
});

router.get("/rooms", authMiddleware, getChatRooms);
router.post("/groups", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), createChatGroup);
router.get("/groups/:id", authMiddleware, getChatGroupById);
router.get("/groups/:id/members", authMiddleware, getChatGroupMembers);
router.put("/groups/:id", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), updateChatGroup);
router.delete("/groups/:id", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), deleteChatGroup);
router.post(
  "/groups/:id/members",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"),
  addChatGroupMembers
);
router.delete(
  "/groups/:id/members/:userId",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"),
  removeChatGroupMember
);
router.get("/messages", authMiddleware, getChatMessages);
router.post("/messages", authMiddleware, createChatMessage);
router.delete("/messages/:id", authMiddleware, deleteChatMessage);
router.post("/clear/:type/:id", authMiddleware, clearChatLocal);
router.post("/read", authMiddleware, markChatRoomRead);
router.post("/attachments", authMiddleware, upload.single("file"), uploadChatAttachment);

export default router;
