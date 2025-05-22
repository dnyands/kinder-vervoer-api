import express from "express";
import cors from "cors";
import studentsRouter from "./routes/students.js";
import driversRouter from "./routes/drivers.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/students", studentsRouter);
app.use("/api/drivers", driversRouter);

app.get("/", (req, res) => res.send("School Dropoff API is running"));

export default app;
