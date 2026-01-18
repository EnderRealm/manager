import { test, expect, beforeAll, afterAll, describe } from "vitest";
import { Hono } from "hono";
import path from "node:path";
import fs from "node:fs";

const fixturesPath = path.join(process.cwd(), "tests/fixtures");

// Override config loading for tests
process.env.CONFIG_PATH = path.join(fixturesPath, "config.json");

// Update fixture config with absolute path
const configPath = path.join(fixturesPath, "config.json");
const configContent = fs.readFileSync(configPath, "utf-8");
fs.writeFileSync(
  configPath,
  configContent.replace("FIXTURE_PATH", fixturesPath)
);

// Import after setting env
const { tickets } = await import("../../src/server/routes/tickets.ts");
const { projects } = await import("../../src/server/routes/projects.ts");

const app = new Hono();
app.route("/api", tickets);
app.route("/api", projects);

async function request(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return app.fetch(req);
}

describe("Projects API", () => {
  test("GET /api/projects returns project list", async () => {
    const res = await request("GET", "/api/projects");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("test-project");
    expect(data[0].ticketCounts).toBeDefined();
  });

  test("GET /api/projects/:id returns single project", async () => {
    const res = await request("GET", "/api/projects/test-project");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.name).toBe("test-project");
    expect(data.ticketCounts).toBeDefined();
  });

  test("GET /api/projects/:id returns 404 for invalid project", async () => {
    const res = await request("GET", "/api/projects/nonexistent");
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("Tickets API", () => {
  test("GET /api/projects/:id/tickets returns all tickets", async () => {
    const res = await request("GET", "/api/projects/test-project/tickets");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(4);
  });

  test("GET /api/projects/:id/tickets/ready returns ready tickets", async () => {
    const res = await request("GET", "/api/projects/test-project/tickets/ready");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // t-0001 (epic) and t-0002 should be ready
    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain("t-0002");
  });

  test("GET /api/projects/:id/tickets/blocked returns blocked tickets", async () => {
    const res = await request("GET", "/api/projects/test-project/tickets/blocked");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // t-0003 depends on t-0002
    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain("t-0003");
  });

  test("GET /api/projects/:id/tickets/closed returns closed tickets", async () => {
    const res = await request("GET", "/api/projects/test-project/tickets/closed");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain("t-0004");
  });

  test("GET /api/projects/:id/tickets/:ticketId returns single ticket", async () => {
    const res = await request("GET", "/api/projects/test-project/tickets/t-0001");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe("t-0001");
    expect(data.type).toBe("epic");
    expect(data.title).toBe("Test Epic");
  });

  test("GET /api/projects/:id/tickets returns 404 for invalid project", async () => {
    const res = await request("GET", "/api/projects/nonexistent/tickets");
    expect(res.status).toBe(404);
  });
});

describe("Ticket Status Transitions", () => {
  test("POST start transitions ticket to in_progress", async () => {
    const res = await request(
      "POST",
      "/api/projects/test-project/tickets/t-0002/start"
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("in_progress");
  });

  test("POST close transitions ticket to closed", async () => {
    const res = await request(
      "POST",
      "/api/projects/test-project/tickets/t-0002/close"
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("closed");
  });

  test("POST reopen transitions ticket to open", async () => {
    const res = await request(
      "POST",
      "/api/projects/test-project/tickets/t-0002/reopen"
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("open");
  });
});

describe("Create Ticket", () => {
  test("POST creates new ticket", async () => {
    const res = await request("POST", "/api/projects/test-project/tickets", {
      title: "New Test Ticket",
      type: "task",
      priority: 2,
    });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.title).toBe("New Test Ticket");
  });

  test("POST returns 400 for missing title", async () => {
    const res = await request("POST", "/api/projects/test-project/tickets", {
      type: "task",
    });
    expect(res.status).toBe(400);
  });
});
