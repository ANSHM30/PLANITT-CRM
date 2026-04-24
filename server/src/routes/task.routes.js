import express from "express";
import {
  createTask,
  getTasks,
  updateTaskStatus,
} from "../controllers/task.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), createTask);
router.get("/", authMiddleware, getTasks);
router.put("/:id", authMiddleware, updateTaskStatus);

export default router;
