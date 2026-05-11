import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../app.js";

type LoginOutput = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    role: string;
    email: string;
    clinicId?: string;
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string | null;
  };
};

type RegisterOutput = {
  id: string;
  role: string;
  email: string;
  clinicJoinCode?: string;
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

const register = async (baseUrl: string, payload: Record<string, unknown>): Promise<RegisterOutput> => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  return (await response.json()) as RegisterOutput;
};

const bootstrapClinic = async (baseUrl: string, uniq: number) => {
  const clinicAdminEmail = `clinic_admin_${uniq}@bjm.local`;
  const doctorEmail = `doctor_${uniq}@bjm.local`;
  const patientEmail = `patient_${uniq}@bjm.local`;
  const password = "123456";

  const clinicAdmin = await register(baseUrl, {
    name: "Clinic Admin",
    email: clinicAdminEmail,
    password,
    role: "clinic_admin",
    clinicName: `Clinica Teste ${uniq}`,
  });
  assert.ok(clinicAdmin.clinicJoinCode);

  const doctor = await register(baseUrl, {
    name: "Doctor QA",
    email: doctorEmail,
    password,
    role: "doctor",
    clinicJoinCode: clinicAdmin.clinicJoinCode,
  });
  const patient = await register(baseUrl, {
    name: "Patient QA",
    email: patientEmail,
    password,
    role: "patient",
    clinicJoinCode: clinicAdmin.clinicJoinCode,
  });

  const doctorSession = await login(baseUrl, doctorEmail, password);
  const patientSession = await login(baseUrl, patientEmail, password);
  const clinicAdminSession = await login(baseUrl, clinicAdminEmail, password);

  const createPatient = await fetch(`${baseUrl}/patients`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${doctorSession.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      userId: patient.id,
      birthDate: "1993-09-12",
      record: {
        allergies: ["dipirona"],
        conditions: ["hipertensao"],
        currentMedications: ["losartana"],
      },
    }),
  });
  assert.equal(createPatient.status, 201);
  const patientProfile = await createPatient.json();

  return {
    doctorSession,
    patientSession,
    clinicAdminSession,
    patientProfileId: String(patientProfile.id),
  };
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
    const clinicAdmin = await register(api.baseUrl, {
      name: "Admin Clinica",
      email: `admin_clinica_${uniq}@bjm.local`,
      password: "123456",
      role: "clinic_admin",
      clinicName: `Clinica Fluxo ${uniq}`,
    });
    assert.ok(clinicAdmin.clinicJoinCode);

    const email = `qa_${uniq}@bjm.local`;
    await register(api.baseUrl, {
      name: "QA User",
      email,
      password: "123456",
      role: "patient",
      clinicJoinCode: clinicAdmin.clinicJoinCode,
    });

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
    assert.equal(loginAfterReset.user.onboardingCompleted, false);
  } finally {
    await api.close();
  }
});

test("routes: blocks patient register without clinic code", async () => {
  const api = await startServer();
  try {
    const uniq = Date.now();
    const email = `qa_nocode_${uniq}@bjm.local`;

    const registerRes = await fetch(`${api.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "QA User", email, password: "123456", role: "patient" }),
    });
    assert.equal(registerRes.status, 422);
  } finally {
    await api.close();
  }
});

test("routes: patients and records", async () => {
  const api = await startServer();
  try {
    const ctx = await bootstrapClinic(api.baseUrl, Date.now());

    const list = await fetch(`${api.baseUrl}/patients`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.ok(Array.isArray(listBody));

    const readRecord = await fetch(`${api.baseUrl}/patients/${ctx.patientProfileId}/record`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(readRecord.status, 200);

    const patchRecord = await fetch(`${api.baseUrl}/patients/${ctx.patientProfileId}/record`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ctx.patientSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ currentMedications: ["losartana", "sildenafil"] }),
    });
    assert.equal(patchRecord.status, 200);

    const history = await fetch(`${api.baseUrl}/patients/${ctx.patientProfileId}/record/history`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(history.status, 200);
    const historyBody = await history.json();
    assert.ok(Array.isArray(historyBody));

    const mePrescriptions = await fetch(`${api.baseUrl}/patients/me/prescriptions`, {
      headers: { Authorization: `Bearer ${ctx.patientSession.token}` },
    });
    assert.equal(mePrescriptions.status, 200);

    const completeUserOnboarding = await fetch(`${api.baseUrl}/auth/me/onboarding`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ctx.patientSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Patient QA",
        email: ctx.patientSession.user.email,
      }),
    });
    assert.equal(completeUserOnboarding.status, 200);
    const onboardingBody = await completeUserOnboarding.json();
    assert.equal(onboardingBody.onboardingCompleted, true);

    const updateProfile = await fetch(`${api.baseUrl}/patients/me/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ctx.patientSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cpf: "12345678901",
        birthDate: "1993-09-12",
        biologicalSex: "masculino",
        phone: "11999999999",
        addressZipCode: "01310100",
        addressStreet: "Avenida Paulista",
        addressNumber: "1000",
        addressComplement: "",
        addressNeighborhood: "Bela Vista",
        addressCity: "Sao Paulo",
        addressState: "SP",
        emergencyContactName: "Contato QA",
        emergencyContactPhone: "11988888888",
      }),
    });
    assert.equal(updateProfile.status, 200);

    const saveAnamnesis = await fetch(`${api.baseUrl}/patients/me/anamnesis`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ctx.patientSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        answers: {
          main_complaint: "Dor de cabeca.",
          diagnosed_conditions: "Sim, hipertensao.",
          smoking: "Nao",
          height: "1,80",
          weight: "82",
          male_urination_difficulty: "Nao",
        }
      }),
    });
    assert.equal(saveAnamnesis.status, 201);

    const readAnamnesis = await fetch(`${api.baseUrl}/patients/${ctx.patientProfileId}/anamnesis`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(readAnamnesis.status, 200);
    const anamnesisBody = await readAnamnesis.json();
    assert.equal(anamnesisBody.anamnesis.answers.diagnosed_conditions, "Sim, hipertensao.");
    assert.equal(anamnesisBody.anamnesis.answers.biological_sex, "masculino");
    assert.equal(anamnesisBody.anamnesis.answers.body_mass_index, "25,3");
  } finally {
    await api.close();
  }
});

test("routes: prescriptions + analysis + alerts + decision + ai + audit", async () => {
  const api = await startServer();
  try {
    const ctx = await bootstrapClinic(api.baseUrl, Date.now());

    const create = await fetch(`${api.baseUrl}/prescriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.doctorSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        patientId: ctx.patientProfileId,
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
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(list.status, 200);

    const detail = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(detail.status, 200);

    const patch = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ctx.doctorSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ conduct: "Repouso e hidratacao" }),
    });
    assert.equal(patch.status, 200);

    const analyze = await fetch(`${api.baseUrl}/prescriptions/${rxId}/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(analyze.status, 200);

    const alertsRes = await fetch(`${api.baseUrl}/prescriptions/${rxId}/alerts`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(alertsRes.status, 200);
    const alerts = (await alertsRes.json()) as Array<{ id: string; severity: string }>;
    assert.ok(alerts.length >= 1);

    const firstAlert = alerts[0];
    const decision = await fetch(`${api.baseUrl}/prescriptions/alerts/${firstAlert.id}/decision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.doctorSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "reviewed",
        justification: firstAlert.severity === "critical" ? "Revisado clinicamente" : undefined,
      }),
    });
    assert.equal(decision.status, 201);

    const ai = await fetch(`${api.baseUrl}/ai/anamnesis/${rxId}`, {
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(ai.status, 200);

    const cancel = await fetch(`${api.baseUrl}/prescriptions/${rxId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.doctorSession.token}` },
    });
    assert.equal(cancel.status, 204);

    const audit = await fetch(`${api.baseUrl}/audit-logs?limit=20`, {
      headers: { Authorization: `Bearer ${ctx.clinicAdminSession.token}` },
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
    const ctx = await bootstrapClinic(api.baseUrl, Date.now());

    const doctorOnly = await fetch(`${api.baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${ctx.patientSession.token}` },
    });

    assert.equal(doctorOnly.status, 403);
  } finally {
    await api.close();
  }
});

test("routes: clinic admin can create and edit clinic users", async () => {
  const api = await startServer();
  try {
    const uniq = Date.now();
    const clinicAdmin = await register(api.baseUrl, {
      name: "Admin Clinica Gestao",
      email: `clinic_manage_${uniq}@bjm.local`,
      password: "123456",
      role: "clinic_admin",
      clinicName: `Clinica Gestao ${uniq}`,
    });
    const clinicAdminSession = await login(api.baseUrl, `clinic_manage_${uniq}@bjm.local`, "123456");

    const createDoctor = await fetch(`${api.baseUrl}/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clinicAdminSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Medico Gestao",
        email: `doctor_manage_${uniq}@bjm.local`,
        password: "123456",
        role: "doctor",
      }),
    });
    assert.equal(createDoctor.status, 201);
    const doctorBody = (await createDoctor.json()) as { userId: string; role: string };
    assert.equal(doctorBody.role, "doctor");

    const createPatient = await fetch(`${api.baseUrl}/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clinicAdminSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Paciente Gestao",
        email: `patient_manage_${uniq}@bjm.local`,
        password: "123456",
        role: "patient",
        cpf: "98765432100",
        birthDate: "1990-08-16",
      }),
    });
    assert.equal(createPatient.status, 201);
    const patientBody = (await createPatient.json()) as { userId: string; role: string; cpf: string | null; birthDate: string | null };
    assert.equal(patientBody.role, "patient");
    assert.equal(patientBody.cpf, "98765432100");
    assert.equal(patientBody.birthDate, "1990-08-16");

    const updatePatient = await fetch(`${api.baseUrl}/admin/users/${patientBody.userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${clinicAdminSession.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Paciente Editado",
        email: `patient_manage_edit_${uniq}@bjm.local`,
        cpf: "11122233344",
        birthDate: "1991-01-20",
      }),
    });
    assert.equal(updatePatient.status, 200);
    const updatedPatient = (await updatePatient.json()) as { name: string; email: string; cpf: string | null; birthDate: string | null };
    assert.equal(updatedPatient.name, "Paciente Editado");
    assert.equal(updatedPatient.email, `patient_manage_edit_${uniq}@bjm.local`);
    assert.equal(updatedPatient.cpf, "11122233344");
    assert.equal(updatedPatient.birthDate, "1991-01-20");

    const dashboard = await fetch(`${api.baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${clinicAdminSession.token}` },
    });
    assert.equal(dashboard.status, 200);
    const dashboardBody = (await dashboard.json()) as Array<{
      doctors: Array<{ userId: string }>;
      patients: Array<{ userId: string; name: string; cpf: string | null; birthDate: string | null }>;
      joinCode: string;
    }>;
    assert.equal(dashboardBody.length, 1);
    assert.equal(dashboardBody[0].joinCode, clinicAdmin.clinicJoinCode);
    assert.ok(dashboardBody[0].doctors.some((item) => item.userId === doctorBody.userId));
    assert.ok(
      dashboardBody[0].patients.some(
        (item) =>
          item.userId === patientBody.userId &&
          item.name === "Paciente Editado" &&
          item.cpf === "11122233344" &&
          item.birthDate === "1991-01-20",
      ),
    );
  } finally {
    await api.close();
  }
});
