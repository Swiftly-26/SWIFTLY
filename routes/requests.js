import express from "express";
import db from "../db.js";
import { v4 as uuid } from "uuid";

const router = express.Router();

const validTransitions = {
  Open: ["In Progress", "Blocked"],
  "In Progress": ["Done", "Blocked"],
  Blocked: ["In Progress"],
  Done: []
};

function checkEscalation(request) {
  if (request.status === "Done") return;

  const due = new Date(request.dueDate);
  const now = new Date();
  const diffDays = (now - due) / (1000 * 60 * 60 * 24);

  if (diffDays > 3 && request.priority !== "Critical") {
    db.prepare(`
      UPDATE requests SET priority='Critical' WHERE id=?
    `).run(request.id);

    db.prepare(`
      INSERT INTO comments VALUES (?,?,?,?,?,?)
    `).run(
      uuid(),
      request.id,
      "System",
      "Priority escalated automatically",
      "System-generated",
      new Date().toISOString()
    );
  }
}

// GET all
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM requests").all();
  rows.forEach(checkEscalation);
  res.json(rows);
});

// CREATE
router.post("/", (req, res) => {
  const id = uuid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    req.body.title,
    req.body.description,
    "Open",
    req.body.priority || "Medium",
    req.body.dueDate,
    null,
    now,
    now
  );

  res.json({ id });
});

// UPDATE STATUS
router.put("/:id/status", (req, res) => {
  const request = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
  if (!request) return res.status(404).send("Not found");

  if (!validTransitions[request.status].includes(req.body.status)) {
    return res.status(400).send("Invalid transition");
  }

  if (req.body.status === "Done" && !request.assignedAgentId) {
    return res.status(400).send("Cannot mark Done if unassigned");
  }

  db.prepare(`
    UPDATE requests SET status=?, updatedAt=? WHERE id=?
  `).run(req.body.status, new Date().toISOString(), req.params.id);

  db.prepare(`
    INSERT INTO comments VALUES (?,?,?,?,?,?)
  `).run(
    uuid(),
    req.params.id,
    req.body.user,
    `Status changed to ${req.body.status}`,
    "Status update",
    new Date().toISOString()
  );

  res.json({ success: true });
});

// ASSIGN
router.put("/:id/assign", (req, res) => {
  db.prepare(`
    UPDATE requests SET assignedAgentId=?, updatedAt=? WHERE id=?
  `).run(req.body.agentId, new Date().toISOString(), req.params.id);

  res.json({ success: true });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM requests WHERE id=?").run(req.params.id);
  db.prepare("DELETE FROM comments WHERE requestId=?").run(req.params.id);
  res.json({ success: true });
});

export default router;
