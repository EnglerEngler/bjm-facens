export const env = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "2h",
  refreshSecret: process.env.REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? "7d",
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbName: process.env.DB_NAME ?? "bjm_facens",
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "rootroot",
  dbLogging: process.env.DB_LOGGING === "true",
};
