import express from "express";
import { createProject, getProjects } from "../controllers/project.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), createProject);

export default router;
