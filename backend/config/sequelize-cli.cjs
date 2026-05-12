require("dotenv").config();

const base = {
  dialect: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "bjm_facens",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootroot",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  timezone: "+00:00",
};

if (process.env.DB_SSL === "true") {
  base.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: true,
    },
  };
}

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || `${base.database}_test`,
  },
  production: base,
};
