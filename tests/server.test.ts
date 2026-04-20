import request from "supertest";
import app, { resetApplications } from "../src/app";

describe("Applications API", () => {
  beforeEach(() => {
    resetApplications();
  });

  it("creates an application", async () => {
    const response = await request(app).post("/applications").send({
      name: "Alice",
      role: "Engineer",
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Alice");
    expect(response.body.role).toBe("Engineer");
    expect(response.body.id).toBe(1);
    expect(response.body.status).toBe("applied");
    expect(response.body.time).toBeDefined();
  });

  it("rejects a request when name is missing, but role is provided", async () => {
    const response = await request(app).post("/applications").send({
      role: "Engineer",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Missing fields" });
  });

  it("rejects a request when role is missing but name is provided", async () => {
    const response = await request(app).post("/applications").send({
      name: "Alice",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Missing fields" });
  });

  it("returns created applications", async () => {
    await request(app).post("/applications").send({
      name: "Alice",
      role: "Engineer",
    });

    await request(app).post("/applications").send({
      name: "Bea",
      role: "Designer",
    });

    const response = await request(app).get("/applications");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        name: "Alice",
        role: "Engineer",
        status: "applied",
        time: expect.any(Number),
      },
      {
        id: 2,
        name: "Bea",
        role: "Designer",
        status: "applied",
        time: expect.any(Number),
      },
    ]);
  });

  it("returns a single application by id", async () => {
    await request(app).post("/applications").send({
      name: "Alice",
      role: "Engineer",
    });

    const response = await request(app).get("/applications/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      name: "Alice",
      role: "Engineer",
      status: "applied",
      time: expect.any(Number),
    });
  });

  it("returns 404 when an application does not exist", async () => {
    const response = await request(app).get("/applications/99");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Application not found" });
  });

  it("updates an application status", async () => {
    await request(app).post("/applications").send({
      name: "Alice",
      role: "Engineer",
    });

    const response = await request(app).patch("/applications/1/status").send({
      status: "interviewing",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      name: "Alice",
      role: "Engineer",
      status: "interviewing",
      time: expect.any(Number),
    });
  });

  it("rejects an invalid status update", async () => {
    await request(app).post("/applications").send({
      name: "Alice",
      role: "Engineer",
    });

    const response = await request(app).patch("/applications/1/status").send({
      status: "hired",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid status" });
  });
});
