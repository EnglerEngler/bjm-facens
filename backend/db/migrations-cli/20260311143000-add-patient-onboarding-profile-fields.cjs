"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("patients", "biological_sex", {
      type: Sequelize.ENUM("masculino", "feminino"),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "phone", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_zip_code", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_street", {
      type: Sequelize.STRING(160),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_number", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_complement", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_neighborhood", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_city", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "address_state", {
      type: Sequelize.STRING(2),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "emergency_contact_name", {
      type: Sequelize.STRING(160),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "emergency_contact_phone", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.addColumn("patients", "onboarding_completed", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("patients", "onboarding_completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("patients", "biological_sex");
    await queryInterface.removeColumn("patients", "onboarding_completed_at");
    await queryInterface.removeColumn("patients", "onboarding_completed");
    await queryInterface.removeColumn("patients", "emergency_contact_phone");
    await queryInterface.removeColumn("patients", "emergency_contact_name");
    await queryInterface.removeColumn("patients", "address_state");
    await queryInterface.removeColumn("patients", "address_city");
    await queryInterface.removeColumn("patients", "address_neighborhood");
    await queryInterface.removeColumn("patients", "address_complement");
    await queryInterface.removeColumn("patients", "address_number");
    await queryInterface.removeColumn("patients", "address_street");
    await queryInterface.removeColumn("patients", "address_zip_code");
    await queryInterface.removeColumn("patients", "phone");
  },
};
