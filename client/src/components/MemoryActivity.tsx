import { useEffect, useState } from 'react';
import { Check, Clock, Eye, ShieldQuestion, Undo2 } from 'lucide-react';
import type {
  ActivityMode,
  ActivityView,
  GameState,
  Role,
} from '../../../shared/protocol';
import { memorySymbols } from '../../../shared/investigation';

const instructions = [
  'Memoriza la combinación de símbolos del candado y reprodúcela para abrirlo.',
  'Memoriza el código del panel y reprodúcelo para cortar la señal de vigilancia.',
  'Recuerda las marcas de la caseta y reprodúcelas para encontrar la llave.',
  'Memoriza la clave del portón y reprodúcela para abrir la salida.',
];

export function MemoryActivity({
  activity,
  role,
  mission,
  rules,
  disabled,
  onChoose,
  onSubmit,
}: {
  activity: ActivityView;
  role: Role | null;
  mission: number;
  rules: GameState['rules'];
  disabled: boolean;
  onChoose: (mode: ActivityMode) => void;
  onSubmit: (answer: number[]) => void;
}) {
  const [answer, setAnswer] = useState<number[]>([]);
  const [now, setNow] = useState(activity.serverNow);
  useEffect(() => {
    const start = performance.now();
    setNow(activity.serverNow);
    const clock = setInterval(
      () => setNow(activity.serverNow + performance.now() - start),
      100,
    );
    return () => clearInterval(clock);
  }, [activity.serverNow]);
  const seconds = Math.max(0, Math.ceil((activity.deadlineAt - now) / 1000));
  const blocked = disabled || seconds === 0;
  if (activity.stage === 'done')
    return (
      <div className="submitted">
        <Check size={26} />
        <p>
          Tu actividad quedó registrada.
          <br />
          <strong>Espera al resto del equipo.</strong>
        </p>
      </div>
    );
  return (
    <section className="memory-activity" aria-labelledby="activity-title">
      <div className="hand-heading">
        <h3 id="activity-title">
          {activity.stage === 'choice'
            ? 'Prepara tu movimiento'
            : activity.stage === 'memorize'
              ? 'Memoriza la secuencia'
              : 'Reproduce la secuencia'}
        </h3>
        <span
          className="activity-clock"
          role="timer"
          aria-live="off"
          aria-label={`${seconds} segundos restantes`}
        >
          <Clock size={15} aria-hidden="true" /> {seconds} s
        </span>
      </div>
      {activity.stage === 'choice' ? (
        <>
          <p>{instructions[mission]}</p>
          <p className="muted">
            Ayuda correcta: +{rules.helpPoints}. Un error o no responder: +
            {rules.minimumPoints}. El servidor comprobará tu respuesta.
          </p>
          {role === 'guard' && (
            <div className="tip">
              <ShieldQuestion size={18} aria-hidden="true" /> Tu decisión es
              secreta. Un sabotaje correcto aporta {rules.sabotagePoints}; si
              fallas, aportas +{rules.minimumPoints} y puedes dejar una pista.
              Si no eliges, solo aportas +{rules.minimumPoints}, sin pista.
            </div>
          )}
          <div className="actions">
            <button
              className="primary"
              disabled={blocked}
              onClick={() => onChoose('help')}
            >
              {role === 'guard' ? 'Ayudar al equipo' : 'Comenzar actividad'}
            </button>
            {role === 'guard' && (
              <button
                className="secondary sabotage-action"
                disabled={blocked}
                onClick={() => onChoose('sabotage')}
              >
                Intentar sabotear
              </button>
            )}
          </div>
        </>
      ) : activity.stage === 'memorize' ? (
        <>
          <p>
            <Eye size={17} aria-hidden="true" /> Observa el orden. Los símbolos
            se ocultarán antes de responder.
          </p>
          {activity.mode === 'sabotage' && (
            <p className="private-note">
              Sabotaje secreto: una secuencia más larga. Nadie ve tu decisión.
            </p>
          )}
          {seconds > 0 && activity.sequence ? (
            <ol
              className="memory-sequence"
              aria-label="Secuencia para memorizar"
            >
              {activity.sequence.map((symbol, i) => (
                <li key={i} data-symbol={symbol}>
                  <span aria-hidden="true">{memorySymbols[symbol].icon}</span>
                  <small>
                    {i + 1}. {memorySymbols[symbol].label}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Preparando tu respuesta…</p>
          )}
        </>
      ) : (
        <>
          <p>
            Selecciona {activity.length} símbolos en el mismo orden. Puedes
            corregirlos antes de enviar; solo tienes un intento.
          </p>
          <ol className="answer-slots" aria-label="Tu respuesta">
            {Array.from({ length: activity.length }, (_, i) => (
              <li key={i}>
                <span aria-hidden="true">
                  {answer[i] === undefined
                    ? '·'
                    : memorySymbols[answer[i]].icon}
                </span>
                <small>
                  {i + 1}.{' '}
                  {answer[i] === undefined
                    ? 'Vacío'
                    : memorySymbols[answer[i]].label}
                </small>
              </li>
            ))}
          </ol>
          <div className="symbol-buttons">
            {memorySymbols.map((symbol, i) => (
              <button
                key={symbol.label}
                disabled={blocked || answer.length >= activity.length}
                onClick={() => setAnswer((previous) => [...previous, i])}
              >
                <span aria-hidden="true">{symbol.icon}</span>
                {symbol.label}
              </button>
            ))}
          </div>
          <div className="actions">
            <button
              className="text-button"
              disabled={blocked || !answer.length}
              onClick={() => setAnswer((previous) => previous.slice(0, -1))}
            >
              <Undo2 size={16} /> Borrar último
            </button>
            <button
              className="primary"
              disabled={blocked || answer.length !== activity.length}
              onClick={() => onSubmit(answer)}
            >
              Enviar secuencia
            </button>
          </div>
        </>
      )}
      {seconds === 0 && (
        <p className="muted" role="status">
          El servidor está cerrando esta etapa…
        </p>
      )}
    </section>
  );
}
