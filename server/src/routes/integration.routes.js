import express from "express";
import {
  disconnectGoogleWorkspace,
  getGoogleAuthUrl,
  getGoogleWorkspaceStatus,
  handleGoogleCallback,
} from "../controllers/integration.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/google/status",
  authMiddleware,
  authorizeRoles("SUPERADMIN"),
  getGoogleWorkspaceStatus
);
router.get("/google/auth-url", authMiddleware, authorizeRoles("SUPERADMIN"), getGoogleAuthUrl);
router.get("/google/callback", handleGoogleCallback);
router.delete(
  "/google/disconnect",
  authMiddleware,
  authorizeRoles("SUPERADMIN"),
  disconnectGoogleWorkspace
);

export default router;
