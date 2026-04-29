import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/index.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use("/api", apiRouter);

export default app;
