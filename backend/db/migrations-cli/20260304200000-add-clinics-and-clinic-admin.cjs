"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("clinics", {
      id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(160),
        allowNull: false,
        unique: true,
      },
      join_code: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('doctor','patient','admin','clinic_admin') NOT NULL
    `);

    await queryInterface.addColumn("users", "clinic_id", {
      type: Sequelize.STRING(50),
      allowNull: true,
      references: {
        model: "clinics",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("users", ["clinic_id"], {
      name: "users_clinic_id_idx",
    });

  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE users
      SET role = 'admin'
      WHERE role = 'clinic_admin'
    `);

    await queryInterface.removeIndex("users", "users_clinic_id_idx");
    await queryInterface.removeColumn("users", "clinic_id");

    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('doctor','patient','admin') NOT NULL
    `);

    await queryInterface.dropTable("clinics");
  },
};
