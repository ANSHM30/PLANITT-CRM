import express from "express";
import multer from "multer";
import {
  createGoogleDriveProjectFolder,
  uploadGoogleDriveFile,
  createGoogleMeetSession,
  createGoogleProjectSheet,
  disconnectGoogleWorkspace,
  getGoogleAuthUrl,
  getGoogleWorkspaceStatus,
  handleGoogleCallback,
} from "../controllers/integration.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();
const googleWorkspaceRoles = ["SUPERADMIN", "ADMIN", "MANAGER"];
const driveUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.get(
  "/google/status",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  getGoogleWorkspaceStatus
);
router.get("/google/auth-url", authMiddleware, authorizeRoles(...googleWorkspaceRoles), getGoogleAuthUrl);
router.get("/google/callback", handleGoogleCallback);
router.post(
  "/google/meet/session",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  createGoogleMeetSession
);
router.post(
  "/google/sheets/project-report",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  createGoogleProjectSheet
);
router.post(
  "/google/drive/project-folder",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  createGoogleDriveProjectFolder
);
router.post(
  "/google/drive/upload",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  driveUpload.single("file"),
  uploadGoogleDriveFile
);
router.delete(
  "/google/disconnect",
  authMiddleware,
  authorizeRoles(...googleWorkspaceRoles),
  disconnectGoogleWorkspace
);

export default router;
