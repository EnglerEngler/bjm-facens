"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("patients", "cpf", {
      type: Sequelize.STRING(11),
      allowNull: true,
    });

    await queryInterface.addIndex("patients", ["cpf"], {
      unique: true,
      name: "patients_cpf_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("patients", "patients_cpf_unique");
    await queryInterface.removeColumn("patients", "cpf");
  },
};
