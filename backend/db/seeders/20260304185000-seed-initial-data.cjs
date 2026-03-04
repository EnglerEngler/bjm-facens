"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("users", [
      {
        id: "user_1",
        name: "Dra. Ana Souza",
        email: "ana@bjm.local",
        password_hash: "$2a$10$KYjihl57/FBMXMV0tfLx/.4QEn7A0uk4.XlOzlwfKK9ASKVZWXRhy",
        role: "doctor",
        created_at: new Date(),
      },
      {
        id: "user_2",
        name: "Joao Paciente",
        email: "joao@bjm.local",
        password_hash: "$2a$10$KYjihl57/FBMXMV0tfLx/.4QEn7A0uk4.XlOzlwfKK9ASKVZWXRhy",
        role: "patient",
        created_at: new Date(),
      },
      {
        id: "user_3",
        name: "Admin BJM",
        email: "admin@bjm.local",
        password_hash: "$2a$10$KYjihl57/FBMXMV0tfLx/.4QEn7A0uk4.XlOzlwfKK9ASKVZWXRhy",
        role: "admin",
        created_at: new Date(),
      },
    ]);

    await queryInterface.bulkInsert("patients", [
      {
        id: "patient_4",
        user_id: "user_2",
        doctor_id: "user_1",
        birth_date: "1993-09-12",
        created_at: new Date(),
      },
    ]);

    await queryInterface.bulkInsert("medical_records", [
      {
        patient_id: "patient_4",
        allergies: JSON.stringify(["dipirona"]),
        conditions: JSON.stringify(["hipertensao"]),
        current_medications: JSON.stringify(["losartana"]),
        last_updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("medical_records", { patient_id: "patient_4" });
    await queryInterface.bulkDelete("patients", { id: "patient_4" });
    await queryInterface.bulkDelete("users", { id: ["user_1", "user_2", "user_3"] });
  },
};
