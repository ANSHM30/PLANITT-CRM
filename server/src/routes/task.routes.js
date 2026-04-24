import express from "express";
import {
  createTask,
  createTaskIssue,
  deleteTask,
  getTasks,
  respondToTaskIssue,
  toggleChecklistItem,
  updateTaskStatus,
} from "../controllers/task.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), createTask);
router.get("/", authMiddleware, getTasks);
router.put("/:id", authMiddleware, updateTaskStatus);
router.delete("/:id", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), deleteTask);
router.put("/checklist/:itemId", authMiddleware, toggleChecklistItem);
router.post("/:id/issues", authMiddleware, createTaskIssue);
router.put("/issues/:issueId/respond", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), respondToTaskIssue);

export default router;
