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
        time: expect.any(Number),
      },
      {
        id: 2,
        name: "Bea",
        role: "Designer",
        time: expect.any(Number),
      },
    ]);
  });
});
