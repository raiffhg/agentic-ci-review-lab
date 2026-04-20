import express from "express";

export const applicationStatuses = [
  "applied",
  "interviewing",
  "offered",
  "rejected",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export interface Application {
  id: number;
  name: string;
  role: string;
  status: ApplicationStatus;
  time: number;
}

const applications: Application[] = [];

export function resetApplications(): void {
  applications.length = 0;
}

const app = express();
app.use(express.json());

function findApplication(id: number): Application | undefined {
  return applications.find((application) => application.id === id);
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    applicationStatuses.includes(value as ApplicationStatus)
  );
}

app.post("/applications", (req, res) => {
  const { name, role } = req.body as Partial<Application>;

  if (!name || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const time = Date.now();

  const newApplication: Application = {
    id: applications.length + 1,
    name,
    role,
    status: "applied",
    time,
  };

  applications.push(newApplication);

  return res.status(201).json(newApplication);
});

app.get("/applications", (_req, res) => {
  res.json(applications);
});

app.get("/applications/:id", (req, res) => {
  const id = Number(req.params.id);
  const application = findApplication(id);

  if (!application) {
    return res.status(404).json({ error: "Application not found" });
  }

  return res.json(application);
});

app.patch("/applications/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const application = findApplication(id);

  if (!application) {
    return res.status(404).json({ error: "Application not found" });
  }

  const { status } = req.body as { status?: unknown };

  if (!isApplicationStatus(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  application.status = status;

  return res.json(application);
});

export default app;
