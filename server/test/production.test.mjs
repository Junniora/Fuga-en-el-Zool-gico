import test from 'node:test';
import assert from 'node:assert/strict';

// Run with plain Node against emitted JavaScript, exactly as production does.
// tsx-based tests can mask ESM/CommonJS package-boundary mistakes.
test('compiled server imports shared modules and serves its health endpoint', async () => {
  const { createGameServer } = await import('../dist/server/src/app.js');
  const { compatiblePlayers, memorySymbols } =
    await import('../dist/shared/investigation.js');
  assert.deepEqual(compatiblePlayers([], []), []);
  assert.equal(memorySymbols.length, 4);
  const server = createGameServer();
  try {
    await new Promise((resolve, reject) => {
      server.http.once('error', reject);
      server.http.listen(0, '127.0.0.1', resolve);
    });
    const address = server.http.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await server.close();
  }
});
