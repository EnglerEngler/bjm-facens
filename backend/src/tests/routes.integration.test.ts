import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../app.js";

type LoginOutput = {
  token: string;
  refreshToken: string;
  user: { id: string; role: string; email: string };
};

const startServer = async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", (error) => reject(error));
  });

  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        (server as Server).close(() => resolve());
      }),
  };
};

const login = async (baseUrl: string, email: string, password: string): Promise<LoginOutput> => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return (await response.json()) as LoginOutput;
};

test("routes: health and db health", async () => {
  const api = await startServer();
  try {
    const health = await fetch(`${api.baseUrl}/health`);
    assert.equal(health.status, 200);

    const dbHealth = await fetch(`${api.baseUrl}/db/health`);
    assert.equal(dbHealth.status, 200);
    const body = await dbHealth.json();
    assert.equal(body.status, "ok");
  } finally {
    await api.close();
  }
});

test("routes: auth full flow (register/login/refresh/forgot/reset)", async () => {
  const api = await startServer();
  try {
    const uniq = Date.now();
    const email = `qa_${uniq}@bjm.local`;

    const register = await fetch(`${api.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "QA User", email, password: "123456", role: "patient" }),
    });
    assert.equal(register.status, 201);

    const loginOut = await login(api.baseUrl, email, "123456");
    assert.ok(loginOut.token.length > 20);
    assert.ok(loginOut.refreshToken.length > 20);

    const refresh = await fetch(`${api.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: loginOut.refreshToken }),
    });
    assert.equal(refresh.status, 200);

    const forgot = await fetch(`${api.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    assert.equal(forgot.status, 200);
    const forgotBody = await forgot.json();
    assert.ok(forgotBody.resetTokenPreview);

    const reset = await fetch(`${api.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: forgotBody.resetTokenPreview, newPassword: "654321" }),
    });
    assert.equal(reset.status, 200);

    const loginAfterReset = await login(api.baseUrl, email, "654321");
    assert.equal(loginAfterReset.user.email, email);
  } finally {
    await api.close();
  }
});

test("routes: patients and records", async () => {
  const api = await startServer();
  try {
    const doctor = await login(api.baseUrl, "ana@bjm.local", "123456");
    const patient = await login(api.baseUrl, "joao@bjm.local", "123456");

    const list = await fetch(`${api.baseUrl}/patients`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.ok(Array.isArray(listBody));

    const readRecord = await fetch(`${api.baseUrl}/patients/patient_4/record`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(readRecord.status, 200);

    const patchRecord = await fetch(`${api.baseUrl}/patients/patient_4/record`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${patient.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ currentMedications: ["losartana", "sildenafil"] }),
    });
    assert.equal(patchRecord.status, 200);

    const history = await fetch(`${api.baseUrl}/patients/patient_4/record/history`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(history.status, 200);
    const historyBody = await history.json();
    assert.ok(Array.isArray(historyBody));

    const mePrescriptions = await fetch(`${api.baseUrl}/patients/me/prescriptions`, {
      headers: { Authorization: `Bearer ${patient.token}` },
    });
    assert.equal(mePrescriptions.status, 200);
  } finally {
    await api.close();
  }
});

test("routes: prescriptions + analysis + alerts + decision + ai + audit", async () => {
  const api = await startServer();
  try {
    const doctor = await login(api.baseUrl, "ana@bjm.local", "123456");

    const create = await fetch(`${api.baseUrl}/prescriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${doctor.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        patientId: "patient_4",
        conduct: "Repouso",
        items: [
          {
            medication: "Dipirona",
            dose: "500mg",
            frequency: "8/8h",
            duration: "3 dias",
            route: "oral",
          },
        ],
      }),
    });
    assert.equal(create.status, 201);
    const created = await create.json();
    const rxId = created.id as string;

    const list = await fetch(`${api.baseUrl}/prescriptions`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(list.status, 200);

    const detail = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(detail.status, 200);

    const patch = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${doctor.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ conduct: "Repouso e hidratacao" }),
    });
    assert.equal(patch.status, 200);

    const analyze = await fetch(`${api.baseUrl}/prescriptions/${rxId}/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(analyze.status, 200);

    const alertsRes = await fetch(`${api.baseUrl}/prescriptions/${rxId}/alerts`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(alertsRes.status, 200);
    const alerts = (await alertsRes.json()) as Array<{ id: string; severity: string }>;
    assert.ok(alerts.length >= 1);

    const firstAlert = alerts[0];
    const decision = await fetch(`${api.baseUrl}/prescriptions/alerts/${firstAlert.id}/decision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${doctor.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "reviewed",
        justification: firstAlert.severity === "critical" ? "Revisado clinicamente" : undefined,
      }),
    });
    assert.equal(decision.status, 201);

    const ai = await fetch(`${api.baseUrl}/ai/anamnesis/${rxId}`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(ai.status, 200);

    const cancel = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(cancel.status, 204);

    const audit = await fetch(`${api.baseUrl}/audit-logs?limit=20`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
    });
    assert.equal(audit.status, 200);
    const auditBody = await audit.json();
    assert.ok(Array.isArray(auditBody));
  } finally {
    await api.close();
  }
});

test("routes: role authorization denies patient on doctor-only routes", async () => {
  const api = await startServer();
  try {
    const patient = await login(api.baseUrl, "joao@bjm.local", "123456");

    const doctorOnly = await fetch(`${api.baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${patient.token}` },
    });

    assert.equal(doctorOnly.status, 403);
  } finally {
    await api.close();
  }
});
