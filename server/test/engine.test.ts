import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine.js';
import { gameConfig } from '../src/game/gameConfig.js';

function setup(count = 4) {
  const engine = new GameEngine();
  const { room } = engine.create('Animal 0', 'socket0');
  for (let i = 1; i < count; i++)
    engine.join(room.code, `Animal ${i}`, `socket${i}`);
  return { engine, room };
}
function start(count = 4) {
  const setupResult = setup(count);
  const { engine, room } = setupResult;
  engine.start(room, room.hostId);
  room.players.forEach((p) => engine.ready(room, p.id));
  return setupResult;
}
function mission(
  engine: GameEngine,
  room: ReturnType<typeof start>['room'],
  win: boolean,
) {
  for (const p of room.players)
    engine.play(
      room,
      p.id,
      p.cards.find((c) => c.value === (win ? 3 : p.role === 'guard' ? -3 : 1))!
        .id,
    );
  engine.continue(room, room.hostId);
}
test('validates room membership, duplicates, host, capacity and names', () => {
  const { engine, room } = setup();
  assert.throws(() => engine.create('  ', 'x'));
  assert.throws(() => engine.join('FAKE', 'Bob', 'x'));
  assert.throws(() => engine.join(room.code, 'animal 0', 'x'));
  assert.throws(() => engine.start(room, room.players[1].id));
  engine.join(room.code, 'E', 'e');
  engine.join(room.code, 'F', 'f');
  assert.throws(() => engine.join(room.code, 'G', 'g'));
  assert.throws(() => engine.start(setup(3).room, 'wrong'));
  const small = setup(3);
  assert.throws(() => small.engine.start(small.room, small.room.hostId));
});
test('secrets stay private for 4, 5 and 6 players; submissions are anonymous', () => {
  for (const count of [4, 5, 6]) {
    const { engine, room } = start(count);
    assert.equal(room.players.filter((p) => p.role === 'guard').length, 1);
    const publicJson = JSON.stringify(engine.publicState(room));
    for (const p of room.players) {
      assert.equal(publicJson.includes(p.token), false);
      assert.equal(publicJson.includes('"role"'), false);
      assert.equal(publicJson.includes('socketId'), false);
      assert.equal(publicJson.includes(p.cards[0].id), false);
      assert.equal(
        engine.privateState(room, p.id).cards.length,
        p.role === 'guard' ? 6 : 3,
      );
    }
    const p = room.players[0];
    engine.play(room, p.id, p.cards[0].id);
    assert.equal(engine.publicState(room).submittedCards, 1);
    assert.equal(engine.publicState(room).history.length, 0);
    assert.throws(() => engine.play(room, p.id, p.cards[0].id));
    assert.throws(() => engine.play(room, room.players[1].id, p.cards[0].id));
    for (const other of room.players.slice(1))
      engine.play(room, other.id, other.cards[0].id);
    assert.equal(room.status, 'missionResult');
    assert.equal(room.history[0].cards.length, count);
    assert.equal(room.history[0].total, count);
    assert.ok(room.history[0].cards.every((c) => typeof c === 'number'));
  }
});
test('four successful missions win; restart clears secrets and scores', () => {
  const { engine, room } = start();
  for (let i = 0; i < 4; i++) {
    mission(engine, room, true);
    engine.continue(room, room.hostId);
  }
  assert.equal(room.winner, 'animal');
  assert.equal(room.status, 'finished');
  assert.equal(engine.publicState(room).guardIds.length, 1);
  engine.again(room, room.hostId);
  assert.equal(room.status, 'waiting');
  assert.equal(room.history.length, 0);
  assert.ok(room.players.every((p) => !p.role && p.cards.length === 0));
});
test('three failed missions win for guard after discussion', () => {
  const { engine, room } = start();
  for (let i = 0; i < 3; i++) {
    mission(engine, room, false);
    engine.continue(room, room.hostId);
  }
  assert.equal(room.winner, 'guard');
  assert.equal(room.failedMissions, 3);
});
test('incomplete escape at final mission wins for guard', () => {
  const { engine, room } = start();
  for (let i = 0; i < 4; i++) {
    mission(engine, room, i !== 1);
    engine.continue(room, room.hostId);
  }
  assert.equal(room.winner, 'guard');
  assert.equal(room.successfulMissions, 3);
});
test('absolute majority discovers guard; private votes and duplicate validation', () => {
  const { engine, room } = start();
  mission(engine, room, true);
  engine.startVoting(room, room.hostId);
  const guard = room.players.find((p) => p.role === 'guard')!;
  const animals = room.players.filter((p) => p.role === 'animal');
  assert.throws(() => engine.vote(room, guard.id, guard.id));
  engine.vote(room, animals[0].id, guard.id);
  assert.equal(engine.publicState(room).voteResult, null);
  assert.throws(() => engine.vote(room, animals[0].id, guard.id));
  for (const p of animals.slice(1)) engine.vote(room, p.id, guard.id);
  engine.vote(room, guard.id, animals[0].id);
  assert.equal(room.voteResult?.wasGuard, true);
  engine.continue(room, room.hostId);
  assert.equal(room.winner, 'animal');
});
test('ties consume accusations; two failed accusations win for guard', () => {
  const { engine, room } = start();
  for (let round = 0; round < gameConfig.MAX_ACCUSATIONS; round++) {
    mission(engine, room, true);
    engine.startVoting(room, room.hostId);
    room.players.forEach((p, i) =>
      engine.vote(room, p.id, room.players[(i + 1) % room.players.length].id),
    );
    assert.equal(room.voteResult?.accusedId, null);
    engine.continue(room, room.hostId);
  }
  assert.equal(room.winner, 'guard');
  assert.equal(room.accusationsRemaining, 0);
});
test('wrong accusation reveals innocence and does not remove a player', () => {
  const { engine, room } = start();
  mission(engine, room, true);
  engine.startVoting(room, room.hostId);
  const animal = room.players.find((p) => p.role === 'animal')!;
  for (const p of room.players)
    engine.vote(
      room,
      p.id,
      p.id === animal.id
        ? room.players.find((other) => other.id !== p.id)!.id
        : animal.id,
    );
  assert.equal(room.voteResult?.wasGuard, false);
  engine.continue(room, room.hostId);
  assert.equal(room.status, 'mission');
  assert.equal(room.players.length, 4);
});
test('authenticated reconnect preserves role and card, transfers host; departures cancel', () => {
  const { engine, room } = start();
  const p = room.players[0];
  const session = engine.session(room, p);
  engine.play(room, p.id, p.cards[0].id);
  const role = p.role;
  engine.disconnect(room, p.id);
  assert.notEqual(room.hostId, p.id);
  assert.throws(() => engine.resume({ ...session, token: 'invalid' }, 'new'));
  engine.resume(session, 'new');
  assert.equal(p.role, role);
  assert.equal(engine.privateState(room, p.id).hasPlayed, true);
  engine.leave(room, p.id);
  assert.equal(room.status, 'finished');
  assert.equal(room.winner, null);
  for (const other of [...room.players]) engine.leave(room, other.id);
  assert.equal(engine.rooms.size, 0);
});
test('invalid phases and malformed values cannot change game state', () => {
  const { engine, room } = setup();
  assert.throws(() => engine.play(room, room.hostId, 'fake'));
  assert.throws(() => engine.vote(room, room.hostId, 'fake'));
  assert.throws(() => engine.continue(room, room.hostId));
  assert.throws(() => engine.resume({} as never, 'x'));
  assert.equal(room.status, 'waiting');
});
