import { Router } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const dbRoutes = Router();

dbRoutes.get("/health", async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    const [row] = await sequelize.query<{ now: string }>("SELECT NOW() AS now", {
      type: QueryTypes.SELECT,
    });

    res.json({
      status: "ok",
      database: "mysql",
      connectedAt: row?.now ?? null,
    });
  } catch (error) {
    next(error);
  }
});
