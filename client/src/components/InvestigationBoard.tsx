import { Search } from 'lucide-react';
import type { GameState } from '../../../shared/protocol';
import { compatiblePlayers } from '../../../shared/investigation';
import { CredentialCard } from './CredentialCard';

export function InvestigationBoard({ room }: { room: GameState }) {
  const candidates = new Set(
    compatiblePlayers(room.players, room.clues).map((p) => p.id),
  );
  return (
    <section
      className="panel investigation-board"
      aria-labelledby="investigation-title"
    >
      <div className="investigation-heading">
        <div>
          <span className="eyebrow">
            <Search size={16} aria-hidden="true" /> EXPEDIENTE DE LA FUGA
          </span>
          <h2 id="investigation-title">Tablero de investigación</h2>
        </div>
        <span className="target-chip">{room.clues.length} pistas</span>
      </div>
      {room.clues.length ? (
        <ol className="clue-list">
          {room.clues.map((clue) => (
            <li key={clue.id}>
              <span className="eyebrow">
                MISIÓN {clue.missionId} ·{' '}
                {room.missions.find((m) => m.id === clue.missionId)?.name}
              </span>
              <p>{clue.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">
          Todavía no hay pistas. Todos siguen siendo compatibles; no encontrar
          evidencia no significa que no exista un guarda.
        </p>
      )}
      <p className="candidate-summary">
        <strong>
          {candidates.size} de {room.players.length}
        </strong>{' '}
        jugadores coinciden con todas las pistas conocidas. La votación sigue
        siendo decisión del equipo.
      </p>
      <div className="credential-grid">
        {room.players.map((player) => (
          <CredentialCard
            key={player.id}
            player={player}
            compatible={candidates.has(player.id)}
          />
        ))}
      </div>
      <p className="investigation-note">
        Completar una actividad no demuestra inocencia. Una misión exitosa puede
        incluir un sabotaje que no alcanzó para hacerla fallar.
      </p>
    </section>
  );
}
