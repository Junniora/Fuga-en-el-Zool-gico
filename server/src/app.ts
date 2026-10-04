import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientEvents,
  Payloads,
  Reply,
  ServerEvents,
} from '../../shared/protocol.js';
import { GameEngine, ensure, type GameRoom } from './game/engine.js';
import { gameConfig } from './game/gameConfig.js';
import {
  defaultActivitySettings,
  type ActivitySettings,
} from './game/activity.js';

export function createGameServer(
  origins = ['http://localhost:5173'],
  activitySettings: ActivitySettings = defaultActivitySettings,
) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents>(http, {
    cors: { origin: origins, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 8192,
    allowRequest: (req, callback) =>
      callback(
        null,
        !req.headers.origin || origins.includes(req.headers.origin),
      ),
  });
  const engine = new GameEngine(Date.now, activitySettings);
  function broadcast(room: GameRoom) {
    io.to(room.code).emit('room-updated', engine.publicState(room));
    for (const player of room.players)
      if (player.socketId)
        io.to(player.socketId).emit(
          'private-state',
          engine.privateState(room, player.id),
        );
  }
  io.on('connection', (socket) => {
    let identity: { code: string; id: string } | null = null;
    let windowStart = Date.now();
    let requests = 0;
    function bind<K extends keyof Payloads>(
      event: K,
      action: (payload: Payloads[K]) => Reply | void,
    ) {
      // The mapped protocol guarantees event-specific payloads at the boundary;
      // all untrusted values are still validated by the engine at runtime.
      const handler = (payload: Payloads[K], ack: (reply: Reply) => void) => {
        if (typeof ack !== 'function') return;
        try {
          if (Date.now() - windowStart > 10_000) {
            windowStart = Date.now();
            requests = 0;
          }
          ensure(
            ++requests <= 35,
            'Demasiadas acciones. Espera unos segundos.',
          );
          ack(action(payload) ?? { ok: true });
        } catch (error) {
          ack({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : 'No se pudo realizar la acción.',
          });
        }
      };
      const register = socket.on.bind(socket) as <E extends keyof Payloads>(
        name: E,
        listener: ClientEvents[E],
      ) => void;
      register(event, handler as ClientEvents[K]);
    }
    function current() {
      const room = identity ? engine.rooms.get(identity.code) : undefined;
      const player = room?.players.find(
        (p) => p.id === identity?.id && p.socketId === socket.id,
      );
      ensure(room && player, 'No tienes una sesión activa.');
      return { room, player };
    }
    function enter(result: ReturnType<GameEngine['create']>) {
      identity = { code: result.room.code, id: result.player.id };
      void socket.join(result.room.code);
      broadcast(result.room);
      return { ok: true, session: engine.session(result.room, result.player) };
    }
    bind('create-room', (payload) => {
      ensure(!identity, 'Ya estás en una sala.');
      return enter(engine.create(payload?.name, socket.id));
    });
    bind('join-room', (payload) => {
      ensure(!identity, 'Ya estás en una sala.');
      return enter(engine.join(payload?.code, payload?.name, socket.id));
    });
    bind('resume-session', (payload) => {
      ensure(!identity, 'Ya estás en una sala.');
      const result = engine.resume(payload, socket.id);
      if (result.oldSocket && result.oldSocket !== socket.id) {
        const old = io.sockets.sockets.get(result.oldSocket);
        old?.emit('room-closed', 'Tu sesión se abrió en otra pestaña.');
        old?.disconnect(true);
      }
      return enter(result);
    });
    function mutate(action: (room: GameRoom, id: string) => void) {
      const { room, player } = current();
      try {
        action(room, player.id);
        room.updatedAt = Date.now();
      } finally {
        // A late/invalid action can still advance an expired server deadline.
        broadcast(room);
      }
    }
    bind('start-game', () => mutate((r, id) => engine.start(r, id)));
    bind('ready-role', () => mutate((r, id) => engine.ready(r, id)));
    bind('choose-activity', (p) =>
      mutate((r, id) => engine.chooseActivity(r, id, p?.activityId, p?.mode)),
    );
    bind('submit-activity', (p) =>
      mutate((r, id) => engine.submitActivity(r, id, p?.activityId, p?.answer)),
    );
    bind('start-voting', () => mutate((r, id) => engine.startVoting(r, id)));
    bind('submit-vote', (p) =>
      mutate((r, id) => engine.vote(r, id, p?.targetId)),
    );
    bind('continue-game', () => mutate((r, id) => engine.continue(r, id)));
    bind('play-again', () => mutate((r, id) => engine.again(r, id)));
    bind('leave-room', () => {
      const { room, player } = current();
      engine.leave(room, player.id);
      void socket.leave(room.code);
      identity = null;
      broadcast(room);
    });
    socket.on('disconnect', () => {
      if (!identity) return;
      const room = engine.rooms.get(identity.code);
      if (
        room?.players.some(
          (p) => p.id === identity!.id && p.socketId === socket.id,
        )
      ) {
        engine.disconnect(room, identity.id);
        broadcast(room);
      }
    });
  });
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const room of engine.rooms.values()) {
      for (const player of [...room.players]) {
        if (
          player.disconnectedAt !== null &&
          now - player.disconnectedAt >= gameConfig.RECONNECT_GRACE_TIME
        ) {
          engine.leave(room, player.id);
          broadcast(room);
        }
      }
      // Departure cancellation takes precedence over activity resolution.
      if (engine.tickRoom(room, now)) broadcast(room);
      if (
        (room.finishedAt !== null &&
          now - room.finishedAt >= gameConfig.ROOM_CLEANUP_TIME) ||
        now - room.updatedAt >= gameConfig.ROOM_IDLE_TIME
      ) {
        io.to(room.code).emit(
          'room-closed',
          'La sala cerró por inactividad o porque terminó la partida.',
        );
        engine.rooms.delete(room.code);
        io.in(room.code).disconnectSockets(true);
      }
    }
  }, gameConfig.TICK_INTERVAL);
  cleanup.unref();
  return {
    http,
    io,
    engine,
    close: () => {
      clearInterval(cleanup);
      return new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
