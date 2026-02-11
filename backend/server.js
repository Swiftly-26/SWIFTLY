import express from "express";
import cors from "cors";
import { runMigrations } from "./migrations.js";
import requestRoutes from "./routes/requests.js";
import agentRoutes from "./routes/agents.js";

runMigrations();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/requests", requestRoutes);
app.use("/api/agents", agentRoutes);

app.listen(3000, () => {
  console.log("SWIFTLY API running on http://localhost:3000");
});
