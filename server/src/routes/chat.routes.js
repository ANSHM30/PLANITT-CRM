import express from "express";
import { createChatMessage, getChatMessages, getChatRooms } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/rooms", authMiddleware, getChatRooms);
router.get("/messages", authMiddleware, getChatMessages);
router.post("/messages", authMiddleware, createChatMessage);

export default router;
