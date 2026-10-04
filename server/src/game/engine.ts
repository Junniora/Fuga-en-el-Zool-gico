import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  Card,
  GameState,
  MissionResult,
  Player,
  PrivateState,
  Role,
  Session,
  VoteResult,
} from '../../../shared/protocol.js';
import { gameConfig as config, missionTemplates } from './gameConfig.js';

interface InternalPlayer extends Player {
  token: string;
  socketId: string | null;
  role: Role | null;
  cards: Card[];
  ready: boolean;
  disconnectedAt: number | null;
}
export interface GameRoom {
  code: string;
  hostId: string;
  players: InternalPlayer[];
  status: GameState['status'];
  currentMission: number;
  successfulMissions: number;
  failedMissions: number;
  accusationsRemaining: number;
  playedCards: Map<string, Card>;
  votes: Map<string, string>;
  history: MissionResult[];
  voteResult: VoteResult | null;
  winner: Role | null;
  reason: string | null;
  finishedAt: number | null;
  updatedAt: number;
}
const avatars = ['🦁', '🐯', '🐵', '🦊', '🐼', '🐨'];
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function resolveAccusation(
  votes: Map<string, string>,
  players: InternalPlayer[],
): VoteResult {
  const counts = Object.fromEntries(players.map((p) => [p.id, 0]));
  for (const id of votes.values()) counts[id]++;
  const accused = players.find((p) => counts[p.id] > players.length / 2);
  return {
    counts,
    accusedId: accused?.id ?? null,
    wasGuard: accused ? accused.role === 'guard' : null,
  };
}
export class GameEngine {
  readonly rooms = new Map<string, GameRoom>();
  name(value: unknown): string {
    ensure(typeof value === 'string', 'Escribe tu nombre.');
    const name = value.trim();
    ensure(
      name.length >= 1 &&
        name.length <= 24 &&
        !/[\u0000-\u001f\u007f]/u.test(name),
      'El nombre debe tener entre 1 y 24 caracteres.',
    );
    return name;
  }
  player(name: string, socketId: string, avatar: string): InternalPlayer {
    return {
      id: randomUUID(),
      token: randomUUID(),
      name,
      socketId,
      avatar,
      connected: true,
      role: null,
      cards: [],
      ready: false,
      disconnectedAt: null,
    };
  }
  create(
    name: unknown,
    socketId: string,
  ): { room: GameRoom; player: InternalPlayer } {
    ensure(
      this.rooms.size < config.MAX_ROOMS,
      'El servidor está lleno. Intenta más tarde.',
    );
    const player = this.player(this.name(name), socketId, avatars[0]);
    let code: string;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      code = `Z${Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('')}`;
    } while (this.rooms.has(code));
    const room: GameRoom = {
      code,
      hostId: player.id,
      players: [player],
      status: 'waiting',
      currentMission: 0,
      successfulMissions: 0,
      failedMissions: 0,
      accusationsRemaining: config.MAX_ACCUSATIONS,
      playedCards: new Map(),
      votes: new Map(),
      history: [],
      voteResult: null,
      winner: null,
      reason: null,
      finishedAt: null,
      updatedAt: Date.now(),
    };
    this.rooms.set(code, room);
    return { room, player };
  }
  join(code: unknown, name: unknown, socketId: string) {
    ensure(typeof code === 'string', 'Escribe el código de sala.');
    const room = this.rooms.get(code.trim().toUpperCase());
    ensure(room, 'La sala no existe o ya ha cerrado.');
    ensure(room.status === 'waiting', 'Esta partida ya comenzó.');
    ensure(room.players.length < config.MAX_PLAYERS, 'La sala está llena.');
    const clean = this.name(name);
    ensure(
      !room.players.some(
        (p) => p.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
      ),
      'Ese nombre ya está en la sala.',
    );
    const avatar =
      avatars.find((a) => !room.players.some((p) => p.avatar === a)) ??
      avatars[0];
    const player = this.player(clean, socketId, avatar);
    room.players.push(player);
    room.updatedAt = Date.now();
    return { room, player };
  }
  resume(session: Session, socketId: string) {
    ensure(
      typeof session?.roomCode === 'string' &&
        typeof session?.token === 'string' &&
        typeof session?.playerId === 'string',
      'Sesión inválida.',
    );
    const room = this.rooms.get(session.roomCode);
    const player = room?.players.find((p) => p.id === session.playerId);
    ensure(room && player, 'La sesión ha caducado. Crea o únete a otra sala.');
    const a = Buffer.from(player.token);
    const b = Buffer.from(session.token);
    ensure(
      a.length === b.length && timingSafeEqual(a, b),
      'No se pudo verificar la sesión.',
    );
    const oldSocket = player.socketId;
    player.socketId = socketId;
    player.connected = true;
    player.disconnectedAt = null;
    if (!room.players.some((p) => p.id === room.hostId && p.connected))
      room.hostId = player.id;
    room.updatedAt = Date.now();
    return { room, player, oldSocket };
  }
  session(room: GameRoom, player: InternalPlayer): Session {
    return {
      roomCode: room.code,
      playerId: player.id,
      playerName: player.name,
      token: player.token,
    };
  }
  host(room: GameRoom, id: string) {
    ensure(room.hostId === id, 'Solo el anfitrión puede hacer esto.');
  }
  phase(room: GameRoom, ...phases: GameState['status'][]) {
    ensure(
      phases.includes(room.status),
      'Esta acción no corresponde a la fase actual.',
    );
  }
  start(room: GameRoom, id: string) {
    this.host(room, id);
    this.phase(room, 'waiting');
    ensure(
      room.players.length >= config.MIN_PLAYERS &&
        room.players.every((p) => p.connected),
      'Se necesitan al menos 4 jugadores y todos deben estar conectados.',
    );
    ensure(
      config.NUMBER_OF_GUARDS >= 1 &&
        config.NUMBER_OF_GUARDS < room.players.length,
      'Configuración de guardas inválida.',
    );
    const guards = new Set(
      shuffle(room.players)
        .slice(0, config.NUMBER_OF_GUARDS)
        .map((p) => p.id),
    );
    for (const p of room.players) {
      p.role = guards.has(p.id) ? 'guard' : 'animal';
      p.ready = false;
    }
    room.status = 'roleReveal';
  }
  ready(room: GameRoom, id: string) {
    this.phase(room, 'roleReveal');
    const p = room.players.find((p) => p.id === id)!;
    ensure(!p.ready, 'Ya confirmaste tu rol.');
    p.ready = true;
    if (room.players.every((p) => p.ready)) this.beginMission(room);
  }
  beginMission(room: GameRoom) {
    room.status = 'mission';
    room.playedCards.clear();
    room.votes.clear();
    room.voteResult = null;
    for (const p of room.players)
      p.cards = (p.role === 'guard' ? [1, 2, 3, -1, -2, -3] : [1, 2, 3]).map(
        (value) => ({ id: randomUUID(), value }),
      );
  }
  play(room: GameRoom, id: string, cardId: unknown) {
    this.phase(room, 'mission');
    ensure(!room.playedCards.has(id), 'Ya elegiste tu carta.');
    const player = room.players.find((p) => p.id === id)!;
    const card = player.cards.find((c) => c.id === cardId);
    ensure(card, 'La carta no pertenece a tu mano.');
    room.playedCards.set(id, card);
    if (room.playedCards.size === room.players.length) {
      const cards = shuffle([...room.playedCards.values()].map((c) => c.value));
      const total = cards.reduce((a, b) => a + b, 0);
      const requiredPoints = this.requiredPoints(room);
      const success = total >= requiredPoints;
      room.history.push({
        missionId: missionTemplates[room.currentMission].id,
        cards,
        total,
        requiredPoints,
        success,
      });
      if (success) room.successfulMissions++;
      else room.failedMissions++;
      room.status = 'missionResult';
    }
  }
  startVoting(room: GameRoom, id: string) {
    this.host(room, id);
    this.phase(room, 'discussion');
    ensure(room.accusationsRemaining > 0, 'No quedan acusaciones.');
    room.votes.clear();
    room.voteResult = null;
    room.status = 'voting';
  }
  vote(room: GameRoom, id: string, targetId: unknown) {
    this.phase(room, 'voting');
    ensure(!room.votes.has(id), 'Ya emitiste tu voto.');
    ensure(
      targetId !== id && room.players.some((p) => p.id === targetId),
      'Selecciona a otro jugador.',
    );
    room.votes.set(id, targetId as string);
    if (room.votes.size === room.players.length) {
      room.accusationsRemaining--;
      room.voteResult = resolveAccusation(room.votes, room.players);
      room.status = 'voteResult';
    }
  }
  finish(room: GameRoom, winner: Role | null, reason: string) {
    room.status = 'finished';
    room.winner = winner;
    room.reason = reason;
    room.finishedAt = Date.now();
  }
  continue(room: GameRoom, id: string) {
    this.host(room, id);
    this.phase(room, 'missionResult', 'discussion', 'voteResult');
    if (room.status === 'missionResult') {
      room.status = 'discussion';
      return;
    }
    if (room.status === 'voteResult') {
      if (room.voteResult?.wasGuard) {
        this.finish(
          room,
          'animal',
          'El equipo descubrió al guarda encubierto.',
        );
        return;
      }
      if (room.accusationsRemaining === 0) {
        this.finish(
          room,
          'guard',
          'Se agotaron las oportunidades de acusación.',
        );
        return;
      }
    }
    if (room.successfulMissions >= config.REQUIRED_SUCCESSES) {
      this.finish(room, 'animal', 'El equipo completó la fuga.');
      return;
    }
    if (room.failedMissions >= config.MAX_FAILED_MISSIONS) {
      this.finish(room, 'guard', 'Demasiadas misiones fallaron.');
      return;
    }
    if (room.currentMission + 1 >= missionTemplates.length) {
      this.finish(room, 'guard', 'Llegó el amanecer sin completar la fuga.');
      return;
    }
    room.currentMission++;
    this.beginMission(room);
  }
  again(room: GameRoom, id: string) {
    this.host(room, id);
    this.phase(room, 'finished');
    room.status = 'waiting';
    room.currentMission = 0;
    room.successfulMissions = 0;
    room.failedMissions = 0;
    room.accusationsRemaining = config.MAX_ACCUSATIONS;
    room.history = [];
    room.voteResult = null;
    room.playedCards.clear();
    room.votes.clear();
    room.winner = null;
    room.reason = null;
    room.finishedAt = null;
    for (const p of room.players) {
      p.role = null;
      p.cards = [];
      p.ready = false;
    }
  }
  disconnect(room: GameRoom, id: string) {
    const player = room.players.find((p) => p.id === id);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = Date.now();
    if (room.hostId === id)
      room.hostId = room.players.find((p) => p.connected)?.id ?? id;
  }
  leave(room: GameRoom, id: string) {
    const player = room.players.find((p) => p.id === id);
    if (!player) return;
    if (room.status !== 'waiting' && room.status !== 'finished')
      this.finish(
        room,
        null,
        `${player.name} abandonó la partida. Reúnan al equipo para volver a jugar.`,
      );
    room.players = room.players.filter((p) => p.id !== id);
    if (room.hostId === id)
      room.hostId =
        room.players.find((p) => p.connected)?.id ?? room.players[0]?.id ?? '';
    if (room.players.length === 0) this.rooms.delete(room.code);
  }
  requiredPoints(room: GameRoom) {
    return Math.ceil(room.players.length * config.POINTS_PER_PLAYER);
  }
  publicState(room: GameRoom): GameState {
    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map(({ id, name, connected, avatar }) => ({
        id,
        name,
        connected,
        avatar,
      })),
      status: room.status,
      currentMission: room.currentMission,
      missions: missionTemplates.map((m) => ({
        ...m,
        requiredPoints: this.requiredPoints(room),
      })),
      successfulMissions: room.successfulMissions,
      failedMissions: room.failedMissions,
      accusationsRemaining: room.accusationsRemaining,
      submittedCards: room.playedCards.size,
      submittedVotes: room.votes.size,
      readyCount: room.players.filter((p) => p.ready).length,
      history: room.history,
      voteResult: room.voteResult,
      winner: room.winner,
      reason: room.reason,
      guardIds:
        room.status === 'finished'
          ? room.players.filter((p) => p.role === 'guard').map((p) => p.id)
          : [],
      rules: {
        minPlayers: config.MIN_PLAYERS,
        maxPlayers: config.MAX_PLAYERS,
        maxFailedMissions: config.MAX_FAILED_MISSIONS,
        requiredSuccesses: config.REQUIRED_SUCCESSES,
        maxAccusations: config.MAX_ACCUSATIONS,
      },
    };
  }
  privateState(room: GameRoom, id: string): PrivateState {
    const p = room.players.find((p) => p.id === id)!;
    return {
      role: p.role,
      cards: p.cards,
      hasPlayed: room.playedCards.has(id),
      hasVoted: room.votes.has(id),
      ready: p.ready,
    };
  }
}
