"use strict";

const safe = async (fn) => {
  try {
    await fn();
  } catch {
    // no-op
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("doctors", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      clinic_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: "clinics",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("admins", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("clinic_admins", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      clinic_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: "clinics",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addColumn("patients", "clinic_id", {
      type: Sequelize.STRING(50),
      allowNull: true,
      references: {
        model: "clinics",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("patients", ["clinic_id"], { name: "idx_patients_clinic_id" });

    await queryInterface.sequelize.query(`
      UPDATE patients p
      JOIN users u ON u.id = p.user_id
      SET p.clinic_id = u.clinic_id
      WHERE p.clinic_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO patients (id, user_id, birth_date, created_at, clinic_id)
      SELECT CONCAT('patient_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 19)), u.id, NULL, u.created_at, u.clinic_id
      FROM users u
      LEFT JOIN patients p ON p.user_id = u.id
      WHERE u.role = 'patient' AND p.user_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO doctors (id, user_id, clinic_id, created_at)
      SELECT CONCAT('doctor_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 20)), u.id, u.clinic_id, u.created_at
      FROM users u
      LEFT JOIN doctors d ON d.user_id = u.id
      WHERE u.role = 'doctor' AND d.user_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO admins (id, user_id, created_at)
      SELECT CONCAT('admin_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 21)), u.id, u.created_at
      FROM users u
      LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.role = 'admin' AND a.user_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO clinic_admins (id, user_id, clinic_id, created_at)
      SELECT CONCAT('clinicadmin_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 15)), u.id, u.clinic_id, u.created_at
      FROM users u
      LEFT JOIN clinic_admins ca ON ca.user_id = u.id
      WHERE u.role = 'clinic_admin' AND ca.user_id IS NULL
    `);

    await safe(() => queryInterface.removeConstraint("prescriptions", "prescriptions_ibfk_1"));
    await queryInterface.addConstraint("prescriptions", {
      fields: ["doctor_id"],
      type: "foreign key",
      name: "prescriptions_doctor_id_doctors_fk",
      references: {
        table: "doctors",
        field: "user_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await safe(() => queryInterface.removeConstraint("doctor_decisions", "doctor_decisions_ibfk_2"));
    await queryInterface.addConstraint("doctor_decisions", {
      fields: ["doctor_id"],
      type: "foreign key",
      name: "doctor_decisions_doctor_id_doctors_fk",
      references: {
        table: "doctors",
        field: "user_id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await safe(() => queryInterface.removeConstraint("patients", "patients_ibfk_2"));
    await safe(() => queryInterface.removeIndex("patients", "idx_patients_doctor_id"));
    await safe(() => queryInterface.removeColumn("patients", "doctor_id"));

    await safe(() => queryInterface.removeIndex("patients", "user_id"));
    await queryInterface.addConstraint("patients", {
      fields: ["user_id"],
      type: "unique",
      name: "uq_patients_user_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await safe(() => queryInterface.removeConstraint("patients", "uq_patients_user_id"));
    await safe(() => queryInterface.addIndex("patients", ["user_id"], { name: "user_id" }));

    await queryInterface.addColumn("patients", "doctor_id", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addIndex("patients", ["doctor_id"], { name: "idx_patients_doctor_id" });
    await queryInterface.addConstraint("patients", {
      fields: ["doctor_id"],
      type: "foreign key",
      name: "patients_ibfk_2",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await safe(() => queryInterface.removeConstraint("doctor_decisions", "doctor_decisions_doctor_id_doctors_fk"));
    await queryInterface.addConstraint("doctor_decisions", {
      fields: ["doctor_id"],
      type: "foreign key",
      name: "doctor_decisions_ibfk_2",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await safe(() => queryInterface.removeConstraint("prescriptions", "prescriptions_doctor_id_doctors_fk"));
    await queryInterface.addConstraint("prescriptions", {
      fields: ["doctor_id"],
      type: "foreign key",
      name: "prescriptions_ibfk_1",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await safe(() => queryInterface.removeIndex("patients", "idx_patients_clinic_id"));
    await safe(() => queryInterface.removeColumn("patients", "clinic_id"));

    await queryInterface.dropTable("clinic_admins");
    await queryInterface.dropTable("admins");
    await queryInterface.dropTable("doctors");
  },
};
