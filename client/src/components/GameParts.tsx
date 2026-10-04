import { Check, Crown, LockKeyhole, Radio, ShieldQuestion } from 'lucide-react';
import type {
  Card,
  GameState,
  Player,
  PrivateState,
} from '../../../shared/protocol';
export function PlayerList({
  players,
  hostId,
  me,
}: {
  players: Player[];
  hostId: string;
  me?: string;
}) {
  return (
    <div className="players">
      {players.map((p) => (
        <div className="player" key={p.id}>
          <span className="avatar">{p.avatar}</span>
          <span>
            <strong>
              {p.name} {p.id === me && <small>(tú)</small>}
            </strong>
            <small className={p.connected ? 'online' : 'offline'}>
              {p.connected ? 'En el campamento' : 'Reconectando…'}
            </small>
          </span>
          {p.id === hostId && <Crown size={18} aria-label="Anfitrión" />}
        </div>
      ))}
    </div>
  );
}
export function MissionProgress({ room }: { room: GameState }) {
  return (
    <div className="mission-progress">
      {room.missions.map((m, i) => {
        const result = room.history.find((r) => r.missionId === m.id);
        return (
          <div
            key={m.id}
            className={`mission-step ${i === room.currentMission ? 'active' : ''} ${result ? (result.success ? 'passed' : 'failed') : ''}`}
          >
            <span>{result ? (result.success ? '✓' : '×') : m.icon}</span>
            <small>{m.name}</small>
          </div>
        );
      })}
    </div>
  );
}
export function GameCard({
  card,
  selected,
  disabled,
  onClick,
}: {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = `playing-card ${card.value < 0 ? 'sabotage' : ''} ${selected ? 'selected' : ''}`;
  const content = (
    <>
      <span className="card-corner">
        {card.value > 0 ? '+' : ''}
        {card.value}
      </span>
      {card.value < 0 ? (
        <ShieldQuestion size={30} />
      ) : (
        <LockKeyhole size={30} />
      )}
      <b>
        {card.value > 0 ? '+' : ''}
        {card.value}
      </b>
      <span>{card.value < 0 ? 'Sabotaje' : 'Ayuda'}</span>
      {selected && <Check className="card-check" size={18} />}
    </>
  );
  return onClick ? (
    <button
      className={className}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className={`${className} contribution-card`}>{content}</div>
  );
}
export function SecretRole({
  secret,
  onReady,
  disabled,
}: {
  secret: PrivateState;
  onReady: () => void;
  disabled: boolean;
}) {
  return (
    <div className="secret-reveal">
      <span className="role-emoji">
        {secret.role === 'guard' ? '🕵️' : '🐯'}
      </span>
      <span className="eyebrow">Solo para tus ojos</span>
      <h2>
        {secret.role === 'guard'
          ? 'Eres el guarda encubierto'
          : 'Eres un animal'}
      </h2>
      <p>
        {secret.role === 'guard'
          ? 'Gana la confianza del equipo. Sabotea las misiones y evita que descubran tu identidad.'
          : 'Colabora, observa y ayuda al equipo a escapar. Uno de tus compañeros esconde algo.'}
      </p>
      <button
        className="primary"
        disabled={disabled || secret.ready}
        onClick={onReady}
      >
        {secret.ready ? 'Esperando al equipo…' : 'Entendido. Ocultar mi rol'}
      </button>
    </div>
  );
}
export function Waiting({
  count,
  total,
  verb,
}: {
  count: number;
  total: number;
  verb: string;
}) {
  return (
    <div className="waiting" role="status">
      <Radio size={18} />
      <span>
        <strong>
          {count} de {total}
        </strong>{' '}
        jugadores {verb}
      </span>
      <div className="meter">
        <span style={{ width: `${(count / total) * 100}%` }} />
      </div>
    </div>
  );
}
