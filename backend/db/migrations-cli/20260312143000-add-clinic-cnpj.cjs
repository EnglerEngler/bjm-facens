"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("clinics", "cnpj", {
      type: Sequelize.STRING(18),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("clinics", "cnpj");
  },
};
