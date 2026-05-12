import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${env.port}`);
});
