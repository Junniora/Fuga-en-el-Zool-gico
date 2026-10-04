import test from 'node:test';
import assert from 'node:assert/strict';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import type {
  ClientEvents,
  GameState,
  Payloads,
  PrivateState,
  Reply,
  ServerEvents,
  Session,
} from '../../shared/protocol.js';
import { createGameServer } from '../src/app.js';
import { gameConfig } from '../src/game/gameConfig.js';
type Client = Socket<ServerEvents, ClientEvents>;
function request<K extends keyof Payloads>(
  socket: Client,
  event: K,
  data: Payloads[K],
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const emit = socket.timeout(2500).emit as (
      name: K,
      payload: Payloads[K],
      ack: (error: Error | null, result: Reply) => void,
    ) => void;
    emit.call(socket.timeout(2500), event, data, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
}
async function until(check: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('State update timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}
test(
  'real Socket.IO clients complete game, reconnect and never receive other secrets',
  { timeout: 20000 },
  async () => {
    const server = createGameServer(undefined, {
      choiceTime: 5000,
      memorizeTime: 500,
      answerTime: 5000,
      helpLength: 4,
      sabotageLength: 6,
    });
    await new Promise<void>((r) => server.http.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${(server.http.address() as AddressInfo).port}`;
    const sockets: Client[] = [];
    const rooms: (GameState | null)[] = [];
    const secrets: (PrivateState | null)[] = [];
    const sessions: Session[] = [];
    async function client(index: number) {
      const s: Client = io(url, { transports: ['websocket'], forceNew: true });
      sockets.push(s);
      s.on('room-updated', (r) => {
        rooms[index] = r;
      });
      s.on('private-state', (p) => {
        secrets[index] = p;
      });
      await new Promise<void>((resolve, reject) => {
        s.once('connect', resolve);
        s.once('connect_error', reject);
      });
      return s;
    }
    try {
      const host = await client(0);
      const created = await request(host, 'create-room', { name: 'León' });
      assert.equal(created.ok, true);
      sessions.push(created.session!);
      for (let i = 1; i < 4; i++) {
        const s = await client(i);
        const joined = await request(s, 'join-room', {
          code: sessions[0].roomCode,
          name: `Animal ${i}`,
        });
        assert.equal(joined.ok, true);
        sessions.push(joined.session!);
      }
      assert.equal(
        (await request(sockets[1], 'start-game', undefined)).ok,
        false,
      );
      assert.equal((await request(host, 'start-game', undefined)).ok, true);
      await until(() => secrets.filter((s) => s?.role).length === 4);
      assert.equal(secrets.filter((s) => s?.role === 'guard').length, 1);
      for (const state of rooms) {
        const json = JSON.stringify(state);
        for (const session of sessions)
          assert.equal(json.includes(session.token), false);
        assert.equal(json.includes('"role"'), false);
      }
      for (const s of sockets)
        assert.equal((await request(s, 'ready-role', undefined)).ok, true);
      await until(() => rooms[0]?.status === 'missionBrief');
      await request(host, 'continue-game', undefined);
      await until(
        () => rooms[0]?.status === 'mission' && !!secrets[0]?.activity,
      );
      const sequences: number[][] = [];
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) {
        const activityId = secrets[i]!.activity!.id;
        ids.push(activityId);
        assert.equal(
          (
            await request(sockets[i], 'choose-activity', {
              activityId,
              mode: 'help',
            })
          ).ok,
          true,
        );
        await until(() => secrets[i]?.activity?.sequence !== null);
        sequences.push([...secrets[i]!.activity!.sequence!]);
      }
      for (const state of rooms) {
        const json = JSON.stringify(state);
        for (const id of ids) assert.equal(json.includes(id), false);
        for (const field of [
          'sequence',
          'mode',
          'deadline',
          'contribution',
          'failedSabotage',
        ])
          assert.equal(json.includes('"' + field + '"'), false);
      }
      const originalSecret = secrets[0]!;
      assert.equal(
        (
          await request(host, 'submit-activity', {
            activityId: ids[1],
            answer: sequences[1],
          })
        ).ok,
        false,
      );
      host.disconnect();
      await until(() => rooms[1]?.hostId === sessions[1].playerId);
      const replacement = await client(0);
      assert.equal(
        (
          await request(replacement, 'resume-session', {
            ...sessions[0],
            token: 'forged',
          })
        ).ok,
        false,
      );
      assert.equal(
        (await request(replacement, 'resume-session', sessions[0])).ok,
        true,
      );
      await until(() => secrets[0]?.activity?.id === ids[0]);
      assert.equal(secrets[0]!.role, originalSecret.role);
      assert.equal(secrets[0]!.activity!.mode, 'help');
      await until(() =>
        secrets.every((secret) => secret?.activity?.stage === 'answer'),
      );
      assert.equal(secrets[0]!.activity!.sequence, null);
      assert.equal(
        (
          await request(replacement, 'submit-activity', {
            activityId: ids[0],
            answer: sequences[0],
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await request(replacement, 'submit-activity', {
            activityId: ids[0],
            answer: sequences[0],
          })
        ).ok,
        false,
      );
      for (let i = 1; i < 4; i++)
        assert.equal(
          (
            await request(sockets[i], 'submit-activity', {
              activityId: ids[i],
              answer: sequences[i],
            })
          ).ok,
          true,
        );
      await until(() => rooms[1]?.status === 'missionResult');
      assert.equal(rooms[1]!.history[0].total, 8);
      await request(sockets[1], 'continue-game', undefined);
      await request(sockets[1], 'start-voting', undefined);
      const guard = secrets.findIndex((s) => s?.role === 'guard');
      for (let i = 0; i < 4; i++) {
        const s = i === 0 ? replacement : sockets[i];
        const targetId = sessions[i === guard ? (i + 1) % 4 : guard].playerId;
        assert.equal((await request(s, 'submit-vote', { targetId })).ok, true);
        if (i === 0) {
          assert.equal(rooms[1]?.voteResult, null);
          assert.equal(
            (await request(s, 'submit-vote', { targetId })).ok,
            false,
          );
        }
      }
      await until(() => rooms[1]?.status === 'voteResult');
      await request(sockets[1], 'continue-game', undefined);
      await until(() => rooms[1]?.status === 'finished');
      assert.equal(rooms[1]!.winner, 'animal');
      assert.deepEqual(rooms[1]!.guardIds, [sessions[guard].playerId]);
      await request(sockets[1], 'play-again', undefined);
      await until(() => rooms[1]?.status === 'waiting');
      for (const s of [replacement, ...sockets.slice(1, 4)])
        assert.equal((await request(s, 'leave-room', undefined)).ok, true);
      assert.equal(server.engine.rooms.size, 0);
    } finally {
      for (const s of sockets) s.disconnect();
      await server.close();
    }
  },
);
test(
  'cleanup expires disconnected and finished rooms',
  { timeout: 6000 },
  async () => {
    const server = createGameServer();
    try {
      const a = server.engine.create('A', 'a');
      server.engine.disconnect(a.room, a.player.id);
      a.player.disconnectedAt =
        Date.now() - gameConfig.RECONNECT_GRACE_TIME - 1;
      const b = server.engine.create('B', 'b');
      server.engine.finish(b.room, null, 'test');
      b.room.finishedAt = Date.now() - gameConfig.ROOM_CLEANUP_TIME - 1;
      const c = server.engine.create('C', 'c');
      c.room.updatedAt = Date.now() - gameConfig.ROOM_IDLE_TIME - 1;
      await until(() => server.engine.rooms.size === 0);
    } finally {
      await server.close();
    }
  },
);

test('cleanup cancels an abandoned game before expired activities can resolve', async () => {
  const server = createGameServer();
  try {
    const { room } = server.engine.create('A', 'a');
    for (let i = 1; i < 4; i++) server.engine.join(room.code, 'P' + i, 's' + i);
    server.engine.start(room, room.hostId);
    for (const p of room.players) server.engine.ready(room, p.id);
    server.engine.continue(room, room.hostId);
    const guard = room.players.find((p) => p.role === 'guard')!;
    server.engine.chooseActivity(
      room,
      guard.id,
      guard.activity!.id,
      'sabotage',
    );
    server.engine.disconnect(room, guard.id);
    guard.disconnectedAt = Date.now() - gameConfig.RECONNECT_GRACE_TIME - 1;
    for (const p of room.players) {
      p.activity!.choiceDeadline = Date.now() - 1;
      p.activity!.revealUntil = Date.now() - 1;
      p.activity!.answerDeadline = Date.now() - 1;
    }
    await until(() => room.status === 'finished');
    assert.equal(room.winner, null);
    assert.equal(room.history.length, 0);
    assert.equal(room.clues.length, 0);
  } finally {
    await server.close();
  }
});
