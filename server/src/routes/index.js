import { Router } from "express";
import attendanceRouter from "./attendance.routes.js";
import authRouter from "./auth.routes.js";
import healthRouter from "./health.routes.js";
import taskRouter from "./task.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/health", healthRouter);
router.use("/tasks", taskRouter);
router.use("/attendance", attendanceRouter);

export default router;
