import express from "express";
import {
  createUser,
  getMyProfile,
  getUserAnalytics,
  getUsers,
  updateMyProfile,
  updateUserProfileByLeadership,
  updateUserAssignment,
} from "../controllers/user.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyProfile);
router.put("/me/profile", authMiddleware, updateMyProfile);
router.get("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), getUsers);
router.get(
  "/:id/analytics",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"),
  getUserAnalytics
);
router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN"), createUser);
router.put(
  "/:id/profile",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"),
  updateUserProfileByLeadership
);
router.put(
  "/:id/assignment",
  authMiddleware,
  authorizeRoles("SUPERADMIN", "ADMIN"),
  updateUserAssignment
);

export default router;
