import { Router } from "express";
import { filesRouter } from "../modules/files/index.js";

const v1Router = Router();

// Domain module routes
v1Router.use("/files", filesRouter);

export { v1Router };
