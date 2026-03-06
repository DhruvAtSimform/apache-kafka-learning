import express from "express";

import { errorHandlerMiddleware } from "@/middlewares/error-handler.middleware.js";
import { notFoundMiddleware } from "@/middlewares/not-found.middleware.js";
import { requestLoggerMiddleware } from "@/middlewares/request-logger.middleware.js";
import { registerRoutes } from "@/routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

registerRoutes(app);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
