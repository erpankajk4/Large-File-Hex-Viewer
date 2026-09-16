import { env } from "./env.config.js";

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      env.clientOrigin,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000"
    ];

    if (allowedOrigins.includes(origin) || env.nodeEnv === "development") {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Range", "Authorization"],
  exposedHeaders: ["Content-Range", "Content-Length", "Accept-Ranges"]
};
