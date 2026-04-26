import { Router } from "express";
import attendanceRouter from "./attendance.routes.js";
import authRouter from "./auth.routes.js";
import dashboardRouter from "./dashboard.routes.js";
import departmentRouter from "./department.routes.js";
import healthRouter from "./health.routes.js";
import integrationRouter from "./integration.routes.js";
import projectRouter from "./project.routes.js";
import taskRouter from "./task.routes.js";
import userRouter from "./user.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/departments", departmentRouter);
router.use("/health", healthRouter);
router.use("/integrations", integrationRouter);
router.use("/projects", projectRouter);
router.use("/tasks", taskRouter);
router.use("/attendance", attendanceRouter);
router.use("/users", userRouter);

export default router;
