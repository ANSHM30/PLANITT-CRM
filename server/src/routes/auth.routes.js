import express from "express";
import {
  getCurrentUser,
  getGoogleLoginUrl,
  handleGoogleLoginCallback,
  login,
  signup,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/google/auth-url", getGoogleLoginUrl);
router.get("/google/callback", handleGoogleLoginCallback);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
