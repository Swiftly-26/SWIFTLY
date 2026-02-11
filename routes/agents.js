import express from "express";
import db from "../db.js";
import { v4 as uuid } from "uuid";

const router = express.Router();

/**
 * GET ALL AGENTS
 */
router.get("/", (req, res) => {
  try {
    const agents = db.prepare("SELECT * FROM agents").all();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET SINGLE AGENT
 */
router.get("/:id", (req, res) => {
  try {
    const agent = db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE AGENT
 * Body: { name: string, role: 'Admin' | 'Agent' }
 */
router.post("/", (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: "Name and role required" });
    }

    if (!["Admin", "Agent"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const id = uuid();

    db.prepare(`
      INSERT INTO agents (id, name, role)
      VALUES (?, ?, ?)
    `).run(id, name, role);

    res.status(201).json({ id, name, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * UPDATE AGENT
 */
router.put("/:id", (req, res) => {
  try {
    const { name, role } = req.body;

    const existing = db
      .prepare("SELECT * FROM agents WHERE id=?")
      .get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Agent not found" });
    }

    db.prepare(`
      UPDATE agents
      SET name = ?, role = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      role || existing.role,
      req.params.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE AGENT
 * Cannot delete if assigned to requests
 */
router.delete("/:id", (req, res) => {
  try {
    const assigned = db.prepare(`
      SELECT COUNT(*) as count
      FROM requests
      WHERE assignedAgentId = ?
    `).get(req.params.id);

    if (assigned.count > 0) {
      return res.status(400).json({
        error: "Cannot delete agent assigned to active requests"
      });
    }

    const result = db
      .prepare("DELETE FROM agents WHERE id = ?")
      .run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
