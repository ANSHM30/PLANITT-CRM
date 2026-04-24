import express from "express";
import {
  createUser,
  getUsers,
  updateUserAssignment,
} from "../controllers/user.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), getUsers);
router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN"), createUser);
router.put(
  "/:id/assignment",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN"),
  updateUserAssignment
);

export default router;
