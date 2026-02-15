import { Hono } from "hono";
import {
  getActivityData,
  getPatterns,
  getLearnings,
} from "../services/learnings.ts";

const activity = new Hono();

activity.get("/activity", async (c) => {
  const range =
    (c.req.query("range") as "year" | "6months" | "3months") || "year";
  const valid = ["year", "6months", "3months"];
  if (!valid.includes(range)) {
    return c.json({ error: "Invalid range. Use: year, 6months, 3months" }, 400);
  }

  const days = getActivityData(range);
  return c.json({ days });
});

activity.get("/patterns", async (c) => {
  const status = c.req.query("status") || undefined;
  const patterns = getPatterns(status);
  return c.json({ patterns });
});

activity.get("/learnings", async (c) => {
  const period =
    (c.req.query("period") as "week" | "month") || "week";
  const valid = ["week", "month"];
  if (!valid.includes(period)) {
    return c.json({ error: "Invalid period. Use: week, month" }, 400);
  }

  const data = getLearnings(period);
  return c.json(data);
});

export { activity };
