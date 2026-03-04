"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(160),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("doctor", "patient", "admin"),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("patients", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      birth_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("medical_records", {
      patient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
        references: {
          model: "patients",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      allergies: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      conditions: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      current_medications: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      last_updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("medical_record_history", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "patients",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      changed_by_user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      before_snapshot: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      after_snapshot: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("prescriptions", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      doctor_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      patient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "patients",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      conduct: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("draft", "active", "cancelled"),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      analyzed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable("prescription_items", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      prescription_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "prescriptions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      medication: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      dose: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      frequency: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      duration: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      route: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
    });

    await queryInterface.createTable("ai_assessments", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      patient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "patients",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      prescription_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "prescriptions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      input_snapshot: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      output_summary: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      prompt_version: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      model_version: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("risk_alerts", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      prescription_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "prescriptions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "patients",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      severity: {
        type: Sequelize.ENUM("critical", "high", "medium", "low"),
        allowNull: false,
      },
      rule_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      evidence: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("open", "accepted", "reviewed", "ignored"),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("doctor_decisions", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      alert_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "risk_alerts",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      action: {
        type: Sequelize.ENUM("accepted", "reviewed", "ignored"),
        allowNull: false,
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("audit_logs", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      actor_user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
      },
      action: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      resource: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      resource_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      ip: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("refresh_sessions", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable("password_reset_tokens", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("patients", ["doctor_id"], {
      name: "idx_patients_doctor_id",
    });
    await queryInterface.addIndex("prescriptions", ["patient_id"], {
      name: "idx_prescriptions_patient_id",
    });
    await queryInterface.addIndex("prescriptions", ["doctor_id"], {
      name: "idx_prescriptions_doctor_id",
    });
    await queryInterface.addIndex("risk_alerts", ["prescription_id"], {
      name: "idx_risk_alerts_prescription_id",
    });
    await queryInterface.addIndex("audit_logs", ["actor_user_id"], {
      name: "idx_audit_logs_actor_user_id",
    });
    await queryInterface.addIndex("audit_logs", ["created_at"], {
      name: "idx_audit_logs_created_at",
    });
    await queryInterface.addIndex("refresh_sessions", ["user_id"], {
      name: "idx_refresh_sessions_user_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("password_reset_tokens");
    await queryInterface.dropTable("refresh_sessions");
    await queryInterface.dropTable("audit_logs");
    await queryInterface.dropTable("doctor_decisions");
    await queryInterface.dropTable("risk_alerts");
    await queryInterface.dropTable("ai_assessments");
    await queryInterface.dropTable("prescription_items");
    await queryInterface.dropTable("prescriptions");
    await queryInterface.dropTable("medical_record_history");
    await queryInterface.dropTable("medical_records");
    await queryInterface.dropTable("patients");
    await queryInterface.dropTable("users");

    // remove ENUM types generated for MySQL compatibility in older environments
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");
  },
};
