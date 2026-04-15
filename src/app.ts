import express from "express";

export interface Application {
  id: number;
  name: string;
  role: string;
}

const applications: Application[] = [];

export function resetApplications(): void {
  applications.length = 0;
}

const app = express();
app.use(express.json());

app.post("/applications", (req, res) => {
  const { name, role } = req.body as Partial<Application>;

  if (!name || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const newApplication: Application = {
    id: applications.length + 1,
    name,
    role,
  };

  applications.push(newApplication);

  return res.status(201).json(newApplication);
});

app.get("/applications", (_req, res) => {
  res.json(applications);
});

export default app;
