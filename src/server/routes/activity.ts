import { Hono } from "hono";
import { getActivityData } from "../services/learnings.ts";

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

export { activity };
