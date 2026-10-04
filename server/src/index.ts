import { createGameServer } from './app.js';
const origins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());
const server = createGameServer(origins);
const port = Number(process.env.PORT ?? 3001);
server.http.listen(port, '0.0.0.0', () =>
  console.log(`Fuga en el Zoológico · puerto ${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
