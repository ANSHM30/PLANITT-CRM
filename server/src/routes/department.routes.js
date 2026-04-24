import express from "express";
import {
  createDepartment,
  getDepartments,
} from "../controllers/department.controller.js";
import { authMiddleware, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN", "MANAGER"), getDepartments);
router.post("/", authMiddleware, authorizeRoles("SUPERADMIN", "ADMIN"), createDepartment);

export default router;
