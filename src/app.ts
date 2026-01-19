import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// database client
export const prisma = new PrismaClient();

import routes from "src/config/routes";
import { protect } from "src/middleware/authMiddleware";

// routes
app.use("/api/v1", routes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Employee Management System API" });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/v1/protected", protect, (req: Request, res: Response) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
