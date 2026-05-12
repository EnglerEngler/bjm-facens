import { createRequire } from "node:module";
import { Sequelize, type Options } from "sequelize";
import { env } from "../config/env.js";

const require = createRequire(import.meta.url);
const mysql2 = require("mysql2");
const mysql2Path = require.resolve("mysql2");

type GlobalWithSequelize = typeof globalThis & {
  __bjmSequelize?: Sequelize;
};

const globalForSequelize = globalThis as GlobalWithSequelize;

const sequelizeOptions: Options = {
  host: env.dbHost,
  port: env.dbPort,
  dialect: "mysql",
  dialectModule: mysql2,
  dialectModulePath: mysql2Path,
  logging: env.dbLogging ? console.log : false,
  pool: {
    max: env.nodeEnv === "production" ? 2 : 5,
    min: 0,
    idle: 10_000,
    acquire: 10_000,
    evict: 10_000,
  },
  define: {
    underscored: true,
    freezeTableName: true,
  },
};

if (env.dbSsl) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: true,
    },
  };
}

export const sequelize =
  globalForSequelize.__bjmSequelize ??
  new Sequelize(env.dbName, env.dbUser, env.dbPassword, sequelizeOptions);

globalForSequelize.__bjmSequelize = sequelize;
