import { Sequelize } from "sequelize";
import { env } from "../config/env.js";

export const sequelize = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
  host: env.dbHost,
  port: env.dbPort,
  dialect: "mysql",
  logging: env.dbLogging ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
});
