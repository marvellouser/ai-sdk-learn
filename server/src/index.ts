import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.SERVER_PORT, () => {
  console.log(`AI SDK Learn server is running on http://localhost:${env.SERVER_PORT}`);
});
