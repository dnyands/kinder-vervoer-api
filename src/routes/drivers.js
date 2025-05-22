import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM drivers");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { name, license_number } = req.body;
  const result = await db.query(
    "INSERT INTO drivers (name, license_number) VALUES ($1, $2) RETURNING *",
    [name, license_number]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
