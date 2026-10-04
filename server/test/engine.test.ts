import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine.js';
import { gameConfig } from '../src/game/gameConfig.js';
import { activityView } from '../src/game/activity.js';
import { assignCredentials, discoverClue } from '../src/game/investigation.js';
import {
  compatiblePlayers,
  credentialFields,
} from '../../shared/investigation.js';
import type { Clue, Player } from '../../shared/protocol.js';

function setup(count = 4, started = true) {
  let now = 1000;
  const engine = new GameEngine(() => now, {
    choiceTime: 200,
    memorizeTime: 80,
    answerTime: 450,
    helpLength: 4,
    sabotageLength: 6,
  });
  const { room } = engine.create('Animal 0', 's0');
  for (let i = 1; i < count; i++)
    engine.join(room.code, 'Animal ' + i, 's' + i);
  if (started) {
    engine.start(room, room.hostId);
    room.players.forEach((p) => engine.ready(room, p.id));
    assert.equal(room.status, 'missionBrief');
    engine.continue(room, room.hostId);
  }
  return {
    engine,
    room,
    advance: (ms: number) => {
      now += ms;
      engine.tickRoom(room);
    },
  };
}
function complete(
  f: ReturnType<typeof setup>,
  mode: 'help' | 'sabotage' = 'help',
  guardCorrect = true,
  animalCorrect = true,
) {
  const { engine, room, advance } = f;
  for (const p of room.players)
    engine.chooseActivity(
      room,
      p.id,
      p.activity!.id,
      p.role === 'guard' ? mode : 'help',
    );
  advance(80);
  for (const p of room.players) {
    const a = p.activity!;
    const answer = [...a.sequence];
    if (!(p.role === 'guard' ? guardCorrect : animalCorrect))
      answer[0] = (answer[0] + 1) % 4;
    engine.submitActivity(room, p.id, a.id, answer);
  }
  assert.equal(room.status, 'missionResult');
}
function next(f: ReturnType<typeof setup>) {
  f.engine.continue(f.room, f.room.hostId); // discussion
  f.engine.continue(f.room, f.room.hostId); // evaluate victory / brief
  if (f.room.status === 'missionBrief')
    f.engine.continue(f.room, f.room.hostId);
}

test('membership, host, capacity, duplicate names and invalid phases are validated', () => {
  const { engine, room } = setup(4, false);
  assert.throws(() => engine.create(' ', 'x'));
  assert.throws(() => engine.join('BAD', 'A', 'x'));
  assert.throws(() => engine.join(room.code, 'animal 0', 'x'));
  assert.throws(() => engine.start(room, room.players[1].id));
  engine.join(room.code, 'E', 'e');
  engine.join(room.code, 'F', 'f');
  assert.throws(() => engine.join(room.code, 'G', 'g'));
  assert.throws(() => engine.chooseActivity(room, room.hostId, 'id', 'help'));
  assert.throws(() => engine.submitActivity(room, room.hostId, 'id', []));
  assert.throws(() => engine.continue(room, room.hostId));
  const small = setup(3, false);
  assert.throws(() => small.engine.start(small.room, small.room.hostId));
});

for (const count of [4, 5, 6]) {
  test(
    'credentials and accumulated clues remain valid for every possible guard with ' +
      count +
      ' players',
    () => {
      for (let iteration = 0; iteration < 60; iteration++) {
        const credentials = assignCredentials(count);
        assert.equal(
          new Set(credentials.map((c) => JSON.stringify(c))).size,
          count,
        );
        for (const c of credentials)
          for (const field of credentialFields)
            assert.ok(
              credentials.filter((other) => other[field] === c[field]).length >=
                2,
            );
        const players: Player[] = credentials.map((credential, i) => ({
          id: String(i),
          name: String(i),
          avatar: '🐯',
          connected: true,
          credential,
        }));
        for (const guard of players) {
          const clues: Clue[] = [];
          let previous = count;
          for (let index = 0; index < 3; index++) {
            const clue = discoverClue(
              players,
              guard.credential!,
              clues,
              index + 1,
            )!;
            assert.ok(clue);
            assert.equal(clue.value, guard.credential![clue.field]);
            assert.ok(!clues.some((c) => c.field === clue.field));
            clues.push(clue);
            const candidates = compatiblePlayers(players, clues);
            assert.ok(candidates.some((p) => p.id === guard.id));
            if (!index) assert.ok(candidates.length >= 2);
            assert.ok(candidates.length <= previous);
            if (previous > 1) assert.ok(candidates.length < previous);
            previous = candidates.length;
          }
          assert.deepEqual(
            compatiblePlayers(players, clues).map((p) => p.id),
            [guard.id],
          );
          assert.equal(
            discoverClue(players, guard.credential!, clues, 4),
            null,
          );
        }
      }
    },
  );

  test(
    'private activities and anonymized success for ' + count + ' players',
    () => {
      const f = setup(count);
      const { engine, room } = f;
      assert.equal(room.players.filter((p) => p.role === 'guard').length, 1);
      for (const p of room.players)
        engine.chooseActivity(room, p.id, p.activity!.id, 'help');
      const publicJson = JSON.stringify(engine.publicState(room));
      for (const p of room.players) {
        assert.ok(!publicJson.includes(p.token));
        assert.ok(!publicJson.includes(p.activity!.id));
        assert.ok(!publicJson.includes('"role"'));
        assert.ok(!publicJson.includes('sequence'));
        assert.deepEqual(
          engine.privateState(room, p.id).activity!.sequence,
          p.activity!.sequence,
        );
      }
      f.advance(80);
      assert.equal(
        engine.privateState(room, room.hostId).activity!.sequence,
        null,
      );
      for (const p of room.players)
        engine.submitActivity(room, p.id, p.activity!.id, p.activity!.sequence);
      assert.equal(room.history[0].total, count * 2);
      assert.equal(room.history[0].requiredPoints, count);
      assert.equal(room.history[0].success, true);
      assert.equal(room.clues.length, 0);
      assert.ok(room.history[0].cards.every((c) => c === 2));
    },
  );
}

test('only the guard can sabotage; malformed, duplicate, early and foreign actions are rejected', () => {
  const f = setup();
  const { engine, room } = f;
  const animal = room.players.find((p) => p.role === 'animal')!;
  const a = animal.activity!;
  assert.throws(() => engine.chooseActivity(room, animal.id, a.id, 'sabotage'));
  assert.throws(() => engine.chooseActivity(room, animal.id, a.id, 'other'));
  assert.throws(() =>
    engine.chooseActivity(room, animal.id, 'foreign', 'help'),
  );
  engine.chooseActivity(room, animal.id, a.id, 'help');
  assert.equal(activityView(a, a.revealUntil).sequence, null);
  assert.throws(() => engine.chooseActivity(room, animal.id, a.id, 'help'));
  assert.throws(() => engine.submitActivity(room, animal.id, a.id, a.sequence));
  f.advance(80);
  for (const invalid of [null, {}, [], [9, 9, 9, 9], ['0', '1', '2', '3']])
    assert.throws(() => engine.submitActivity(room, animal.id, a.id, invalid));
  assert.throws(() =>
    engine.submitActivity(
      room,
      animal.id,
      room.players.find((p) => p.id !== animal.id)!.activity!.id,
      a.sequence,
    ),
  );
  engine.submitActivity(room, animal.id, a.id, a.sequence);
  assert.throws(() => engine.submitActivity(room, animal.id, a.id, a.sequence));
});

test('failed sabotage contributes +1 and publishes evidence only after all finish', () => {
  const f = setup();
  const { engine, room } = f;
  const guard = room.players.find((p) => p.role === 'guard')!;
  for (const p of room.players)
    engine.chooseActivity(
      room,
      p.id,
      p.activity!.id,
      p === guard ? 'sabotage' : 'help',
    );
  f.advance(80);
  const answer = [...guard.activity!.sequence];
  answer[0] = (answer[0] + 1) % 4;
  engine.submitActivity(room, guard.id, guard.activity!.id, answer);
  assert.equal(engine.publicState(room).clues.length, 0);
  assert.equal(engine.publicState(room).history.length, 0);
  assert.equal(engine.publicState(room).completedActivities, 1);
  for (const p of room.players.filter((p) => p !== guard))
    engine.submitActivity(room, p.id, p.activity!.id, p.activity!.sequence);
  assert.equal(room.history[0].total, 7);
  assert.equal(room.history[0].evidence, 'found');
  assert.equal(room.clues.length, 1);
  assert.ok(compatiblePlayers(room.players, room.clues).length >= 2);
});

test('successful sabotage is negative and does not leave evidence; failed animals are not clues', () => {
  const f = setup();
  complete(f, 'sabotage', true, false);
  assert.equal(f.room.history[0].total, 1);
  assert.equal(f.room.failedMissions, 1);
  assert.deepEqual(
    f.room.history[0].cards.sort((a, b) => a - b),
    [-2, 1, 1, 1],
  );
  assert.equal(f.room.clues.length, 0);
  assert.equal(f.room.winner, null);
  assert.equal(f.room.history[0].evidence, 'none');
});

test('deadlines resolve missing choices without inventing sabotage and reject late answers', () => {
  const f = setup();
  f.advance(200);
  assert.equal(f.room.status, 'missionResult');
  assert.equal(f.room.history[0].total, 4);
  assert.equal(f.room.clues.length, 0);
  assert.throws(() =>
    f.engine.chooseActivity(
      f.room,
      f.room.hostId,
      f.room.players[0].activity!.id,
      'help',
    ),
  );
  const g = setup();
  const guard = g.room.players.find((p) => p.role === 'guard')!;
  for (const p of g.room.players)
    g.engine.chooseActivity(
      g.room,
      p.id,
      p.activity!.id,
      p === guard ? 'sabotage' : 'help',
    );
  g.advance(530);
  assert.equal(g.room.history[0].total, 4);
  assert.equal(g.room.clues.length, 1);
  assert.throws(() =>
    g.engine.submitActivity(
      g.room,
      guard.id,
      guard.activity!.id,
      guard.activity!.sequence,
    ),
  );
  assert.equal(g.room.history.length, 1);
  g.engine.tickRoom(g.room);
  assert.equal(g.room.history.length, 1);
});

test('an animal error and a guard help error leave no clues', () => {
  const f = setup();
  complete(f, 'help', false, false);
  assert.equal(f.room.history[0].total, 4);
  assert.equal(f.room.clues.length, 0);
});

test('exhausted clues produce explicit no-new-details result', () => {
  const f = setup();
  const guard = f.room.players.find((p) => p.role === 'guard')!;
  for (let i = 0; i < 3; i++)
    f.room.clues.push(
      discoverClue(f.room.players, guard.credential!, f.room.clues, i + 1)!,
    );
  complete(f, 'sabotage', false);
  assert.equal(f.room.history[0].evidence, 'exhausted');
  assert.equal(f.room.clues.length, 3);
});

test('reconnect preserves choices, challenge, deadlines and completion in all activity stages', () => {
  const f = setup();
  const { engine, room } = f;
  const p = room.players[0];
  const session = engine.session(room, p);
  const resume = () => {
    const before = JSON.stringify(p.activity);
    const credential = JSON.stringify(p.credential);
    engine.disconnect(room, p.id);
    assert.throws(() => engine.resume({ ...session, token: 'wrong' }, 'x'));
    engine.resume(session, 'new');
    assert.equal(JSON.stringify(p.activity), before);
    assert.equal(JSON.stringify(p.credential), credential);
  };
  resume();
  engine.chooseActivity(room, p.id, p.activity!.id, 'help');
  resume();
  f.advance(80);
  resume();
  engine.submitActivity(room, p.id, p.activity!.id, p.activity!.sequence);
  resume();
  assert.equal(engine.privateState(room, p.id).activity!.stage, 'done');
  assert.notEqual(room.hostId, p.id);
});

test('offline elapsed time never resets, expired reconnection rejected, departures cancel and empty rooms delete', () => {
  const f = setup();
  const p = f.room.players[0];
  const session = f.engine.session(f.room, p);
  f.engine.chooseActivity(f.room, p.id, p.activity!.id, 'help');
  f.engine.disconnect(f.room, p.id);
  f.advance(100);
  f.engine.resume(session, 'new');
  assert.equal(f.engine.privateState(f.room, p.id).activity!.stage, 'answer');
  f.engine.disconnect(f.room, p.id);
  f.advance(gameConfig.RECONNECT_GRACE_TIME);
  assert.throws(() => f.engine.resume(session, 'late'));
  f.engine.leave(f.room, p.id);
  assert.equal(f.room.status, 'finished');
  assert.equal(f.room.winner, null);
  for (const other of [...f.room.players]) f.engine.leave(f.room, other.id);
  assert.equal(f.engine.rooms.size, 0);
});

test('three successes win after discussion, restart clears credentials, evidence and challenges', () => {
  const f = setup();
  for (let i = 0; i < 3; i++) {
    complete(f, 'sabotage', false);
    next(f);
  }
  assert.equal(f.room.winner, 'animal');
  assert.equal(f.room.status, 'finished');
  assert.equal(f.engine.publicState(f.room).guardIds.length, 1);
  assert.equal(f.room.clues.length, 3);
  f.engine.again(f.room, f.room.hostId);
  assert.equal(f.room.status, 'waiting');
  assert.deepEqual(f.room.clues, []);
  assert.equal(f.room.history.length, 0);
  assert.ok(
    f.room.players.every((p) => !p.activity && !p.credential && !p.role),
  );
});

test('two failed missions win for guard; second decisive mission still allows a discussion', () => {
  const f = setup();
  for (let i = 0; i < 2; i++) {
    complete(f, 'sabotage', true, false);
    assert.equal(f.room.winner, null);
    next(f);
  }
  assert.equal(f.room.winner, 'guard');
  assert.equal(f.room.failedMissions, 2);
});

test('majority identifies guard, votes remain secret, duplicates and self-votes rejected', () => {
  const f = setup();
  complete(f);
  const { engine, room } = f;
  engine.continue(room, room.hostId);
  engine.startVoting(room, room.hostId);
  const guard = room.players.find((p) => p.role === 'guard')!;
  const animals = room.players.filter((p) => p !== guard);
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

test('incorrect majority reveals innocence without elimination; two unsuccessful accusations win for guard', () => {
  const f = setup();
  for (let round = 0; round < 2; round++) {
    complete(f);
    f.engine.continue(f.room, f.room.hostId);
    f.engine.startVoting(f.room, f.room.hostId);
    const animal = f.room.players.find((p) => p.role === 'animal')!;
    for (const p of f.room.players)
      f.engine.vote(
        f.room,
        p.id,
        p === animal ? f.room.players.find((o) => o !== p)!.id : animal.id,
      );
    assert.equal(f.room.voteResult?.wasGuard, false);
    assert.equal(f.room.players.length, 4);
    f.engine.continue(f.room, f.room.hostId);
    if (!round) f.engine.continue(f.room, f.room.hostId);
  }
  assert.equal(f.room.winner, 'guard');
  assert.equal(f.room.accusationsRemaining, 0);
});

test('a tie uses an accusation and the next challenge rejects an old mission id', () => {
  const f = setup();
  const oldId = f.room.players[0].activity!.id;
  complete(f);
  f.engine.continue(f.room, f.room.hostId);
  f.engine.startVoting(f.room, f.room.hostId);
  f.room.players.forEach((p, i) =>
    f.engine.vote(f.room, p.id, f.room.players[(i + 1) % 4].id),
  );
  assert.equal(f.room.voteResult?.accusedId, null);
  assert.equal(f.room.accusationsRemaining, 1);
  f.engine.continue(f.room, f.room.hostId);
  f.engine.continue(f.room, f.room.hostId);
  assert.throws(() =>
    f.engine.chooseActivity(f.room, f.room.players[0].id, oldId, 'help'),
  );
});

test('configurable end-of-missions fallback prevents an unfinished escape winning', () => {
  const original = [
    gameConfig.REQUIRED_SUCCESSES,
    gameConfig.MAX_FAILED_MISSIONS,
  ];
  try {
    gameConfig.REQUIRED_SUCCESSES = 4;
    gameConfig.MAX_FAILED_MISSIONS = 3;
    const f = setup();
    for (let i = 0; i < 4; i++) {
      complete(f, i === 1 ? 'sabotage' : 'help', true, i !== 1);
      next(f);
    }
    assert.equal(f.room.winner, 'guard');
    assert.match(f.room.reason!, /amanecer/);
  } finally {
    [gameConfig.REQUIRED_SUCCESSES, gameConfig.MAX_FAILED_MISSIONS] = original;
  }
});
