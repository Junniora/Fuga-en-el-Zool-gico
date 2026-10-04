export type Role = 'animal' | 'guard';
export type Phase =
  | 'waiting'
  | 'roleReveal'
  | 'missionBrief'
  | 'mission'
  | 'missionResult'
  | 'discussion'
  | 'voting'
  | 'voteResult'
  | 'finished';
export interface Player {
  id: string;
  name: string;
  connected: boolean;
  avatar: string;
  credential: Credential | null;
}
export interface Credential {
  wristband: string;
  symbol: string;
  tool: string;
}
export interface Clue {
  id: string;
  missionId: number;
  field: keyof Credential;
  value: string;
  text: string;
}
export type ActivityMode = 'help' | 'sabotage';
export type ActivityStage = 'choice' | 'memorize' | 'answer' | 'done';
export interface ActivityView {
  id: string;
  stage: ActivityStage;
  mode: ActivityMode | null;
  sequence: number[] | null;
  length: number;
  deadlineAt: number;
  serverNow: number;
}
export interface Card {
  id: string;
  value: number;
}
export interface Mission {
  id: number;
  name: string;
  description: string;
  icon: string;
  requiredPoints: number;
}
export interface MissionResult {
  missionId: number;
  cards: number[];
  total: number;
  requiredPoints: number;
  success: boolean;
  clue: Clue | null;
  evidence: 'found' | 'exhausted' | 'none';
}
export interface Vote {
  playerId: string;
  targetId: string;
}
export interface PlayedCard {
  playerId: string;
  card: Card;
}
export interface VoteResult {
  counts: Record<string, number>;
  accusedId: string | null;
  wasGuard: boolean | null;
}
export interface GameState {
  code: string;
  hostId: string;
  players: Player[];
  status: Phase;
  currentMission: number;
  missions: Mission[];
  successfulMissions: number;
  failedMissions: number;
  accusationsRemaining: number;
  completedActivities: number;
  clues: Clue[];
  submittedVotes: number;
  readyCount: number;
  history: MissionResult[];
  voteResult: VoteResult | null;
  winner: Role | null;
  reason: string | null;
  guardIds: string[];
  rules: {
    minPlayers: number;
    maxPlayers: number;
    maxFailedMissions: number;
    requiredSuccesses: number;
    maxAccusations: number;
    helpPoints: number;
    minimumPoints: number;
    sabotagePoints: number;
  };
}
export interface PrivateState {
  role: Role | null;
  activity: ActivityView | null;
  hasVoted: boolean;
  ready: boolean;
}
export interface Session {
  roomCode: string;
  playerId: string;
  playerName: string;
  token: string;
}
export interface Reply {
  ok: boolean;
  error?: string;
  session?: Session;
}
export interface Payloads {
  'create-room': { name: string };
  'join-room': { code: string; name: string };
  'resume-session': Session;
  'start-game': undefined;
  'ready-role': undefined;
  'choose-activity': { activityId: string; mode: ActivityMode };
  'submit-activity': { activityId: string; answer: number[] };
  'start-voting': undefined;
  'submit-vote': { targetId: string };
  'continue-game': undefined;
  'leave-room': undefined;
  'play-again': undefined;
}
export type ClientEvents = {
  [K in keyof Payloads]: (
    payload: Payloads[K],
    ack: (reply: Reply) => void,
  ) => void;
};
export interface ServerEvents {
  'room-updated': (state: GameState) => void;
  'private-state': (state: PrivateState) => void;
  'room-closed': (reason: string) => void;
}
