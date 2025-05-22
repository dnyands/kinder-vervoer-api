import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM students");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { full_name, grade } = req.body;
  const result = await db.query(
    "INSERT INTO students (full_name, grade) VALUES ($1, $2) RETURNING *",
    [full_name, grade]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
