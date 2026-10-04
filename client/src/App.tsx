import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  Leaf,
  LogOut,
  Moon,
  PawPrint,
  ShieldQuestion,
  Users,
  X,
} from 'lucide-react';
import { useGame } from './hooks/useGame';
import {
  GameCard,
  MissionProgress,
  PlayerList,
  SecretRole,
  Waiting,
} from './components/GameParts';
import { Modal } from './components/Modal';
import { ThemeToggle } from './components/ThemeToggle';
import { Credits } from './pages/Credits';
import { useTheme } from './hooks/useTheme';
import { MemoryActivity } from './components/MemoryActivity';
import { InvestigationBoard } from './components/InvestigationBoard';
import { CredentialCard } from './components/CredentialCard';

export default function App() {
  const game = useGame();
  const { theme, toggleTheme } = useTheme();
  const { room, secret, session, connected, restoring, busy, send } = game;
  const [page, setPage] = useState<'home' | 'create' | 'join' | 'credits'>(
    'home',
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [target, setTarget] = useState('');
  const [rules, setRules] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const host = room?.hostId === session?.playerId;
  const disabled = busy || !connected || restoring;
  const mission = room?.missions[room.currentMission];
  const result = room?.history.at(-1);
  const me = room?.players.find((p) => p.id === session?.playerId);
  const action = (
    event:
      | 'start-game'
      | 'ready-role'
      | 'continue-game'
      | 'start-voting'
      | 'play-again',
  ) => {
    setShowRole(false);
    void send(event, undefined);
  };
  const hostButtons = (children: React.ReactNode) =>
    host ? (
      <div className="actions">{children}</div>
    ) : (
      <p className="muted waiting-host">
        El anfitrión decidirá el siguiente paso.
      </p>
    );
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!room) setPage('home');
          }}
        >
          <span className="brand-icon">
            <PawPrint size={23} />
          </span>
          <span>
            FUGA<span className="brand-sub">EN EL ZOOLÓGICO</span>
          </span>
        </a>
        <div className="header-right">
          <span className={`connection ${connected ? 'is-connected' : ''}`}>
            <i />
            {connected ? 'Conectados' : 'Sin conexión'}
          </span>
          <button className="text-button" onClick={() => setRules(true)}>
            Cómo jugar <ArrowUpRight size={15} />
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      {game.error && (
        <div className="error-banner" id="game-error" role="alert">
          <span>{game.error}</span>
          <button aria-label="Cerrar aviso" onClick={() => game.setError('')}>
            <X size={18} />
          </button>
        </div>
      )}
      {!connected && (
        <div className="network-note" role="status">
          Conectando con el campamento…{' '}
          <button className="text-button" onClick={game.reconnect}>
            Reintentar
          </button>
        </div>
      )}
      {restoring && !room ? (
        <main className="form-wrap">
          <div className="panel">
            <PawPrint size={40} />
            <h1>Volviendo al campamento…</h1>
            <p>Estamos recuperando tu partida.</p>
          </div>
        </main>
      ) : !room ? (
        <>
          {page === 'credits' ? (
            <Credits
              onBack={() => {
                setPage('home');
                window.scrollTo(0, 0);
                requestAnimationFrame(() =>
                  document
                    .getElementById('credits-link')
                    ?.focus({ preventScroll: true }),
                );
              }}
            />
          ) : page === 'home' ? (
            <main className="home">
              <section className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-line" /> LA NOCHE ES NUESTRA
                </span>
                <h1>
                  Un equipo.
                  <br />
                  Un secreto.
                  <br />
                  <em>Una gran fuga.</em>
                </h1>
                <p className="hero-description">
                  Las puertas están cerradas. El plan está listo.
                  <br className="desktop" /> Pero alguien entre ustedes no
                  quiere escapar.
                </p>
                <div className="hero-actions">
                  <button className="primary" onClick={() => setPage('create')}>
                    Crear partida <ArrowRight size={19} />
                  </button>
                  <button className="secondary" onClick={() => setPage('join')}>
                    Unirme a partida
                  </button>
                </div>
                <div className="game-facts">
                  <span>
                    <Users size={16} /> 4–6 jugadores
                  </span>
                  <span>
                    <ShieldQuestion size={16} /> Roles ocultos
                  </span>
                  <span>
                    <RadioIcon /> En tiempo real
                  </span>
                </div>
                <button
                  id="credits-link"
                  className="text-button home-credits-link"
                  onClick={() => {
                    setPage('credits');
                    window.scrollTo(0, 0);
                  }}
                >
                  Conoce al equipo <span aria-hidden="true">·</span> Créditos{' '}
                  <ArrowUpRight size={14} />
                </button>
              </section>
              <section
                className="jungle-art"
                aria-label="Ilustración de animales preparando una fuga nocturna"
              >
                <div className="art-grain" />
                <span className="art-label">
                  <Moon size={13} /> ZOOLÓGICO · 23:48
                </span>
                <div className="moon" />
                <div className="stars">
                  ✦<span>✧</span>·<span>✦</span>
                </div>
                <div className="jungle-hill back" />
                <div className="jungle-hill front" />
                <div className="fence">
                  {Array.from({ length: 7 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
                <div className="escape-sign">
                  SALIDA <ArrowRight size={21} />
                </div>
                <div className="animal animal-monkey">🐵</div>
                <div className="animal animal-tiger">🐯</div>
                <div className="animal animal-lion">🦁</div>
                <div className="plant plant-left">❧</div>
                <div className="plant plant-right">❧</div>
                <div className="art-caption">
                  <span className="live-dot" /> Operación libertad{' '}
                  <span>01 / 04</span>
                </div>
                <div className="secret-sticker">
                  <Eye size={20} />
                  <span>
                    No confíes
                    <br />
                    <strong>en cualquiera.</strong>
                  </span>
                </div>
              </section>
              <section className="how-strip">
                <div className="strip-title">
                  <span className="eyebrow">EL PLAN DE ESCAPE</span>
                  <h2>
                    Juntos. Hasta que
                    <br />
                    alguien los traicione.
                  </h2>
                </div>
                <div className="how-item">
                  <span>01</span>
                  <h3>Reúne a tu manada</h3>
                  <p>Crea una sala y comparte el código con tus amigos.</p>
                </div>
                <div className="how-item">
                  <span>02</span>
                  <h3>Juega tu papel</h3>
                  <p>Ayuda a escapar… o sabotea sin levantar sospechas.</p>
                </div>
                <div className="how-item">
                  <span>03</span>
                  <h3>Descubre el secreto</h3>
                  <p>Supera las pruebas o encuentra al guarda encubierto.</p>
                </div>
              </section>
            </main>
          ) : (
            <main className="form-wrap">
              <section className="panel entry-panel">
                <button className="text-button" onClick={() => setPage('home')}>
                  ← Volver al inicio
                </button>
                <span className="section-icon">
                  <PawPrint size={30} />
                </span>
                <span className="eyebrow">PREPARA LA FUGA</span>
                <h1>
                  {page === 'create'
                    ? 'Reúne a tu manada.'
                    : 'Tu equipo te espera.'}
                </h1>
                <p>
                  {page === 'create'
                    ? 'Tú preparas el campamento. Ellos traen el plan.'
                    : 'Introduce el código que compartió el anfitrión.'}
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await (page === 'create'
                      ? send('create-room', { name })
                      : send('join-room', { name, code }));
                  }}
                >
                  <label>
                    Tu nombre
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={24}
                      required
                      placeholder="¿Cómo te llama tu manada?"
                      autoComplete="nickname"
                      aria-describedby={game.error ? 'game-error' : undefined}
                    />
                  </label>
                  {page === 'join' && (
                    <label>
                      Código de sala
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        required
                        placeholder="ZXXXXX"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby={game.error ? 'game-error' : undefined}
                      />
                    </label>
                  )}
                  <button className="primary" disabled={disabled}>
                    {busy
                      ? 'Preparando…'
                      : page === 'create'
                        ? 'Crear campamento'
                        : 'Entrar a la sala'}
                    <ArrowRight size={18} />
                  </button>
                </form>
              </section>
            </main>
          )}
        </>
      ) : (
        <main className="game-layout">
          <div className="room-heading">
            <div>
              <span className="eyebrow">CAMPAMENTO BASE</span>
              <h1>
                Sala <span className="room-code">{room.code}</span>
                <button
                  className="icon-button"
                  aria-label="Copiar código de sala"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(room.code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      game.setError(`Comparte este código: ${room.code}`);
                    }
                  }}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </h1>
            </div>
            <button className="text-button" onClick={() => setLeaving(true)}>
              <LogOut size={16} /> Salir
            </button>
          </div>
          <div className="game-columns">
            <section className="panel play-panel" aria-live="polite">
              {room.status === 'waiting' && (
                <>
                  <span className="section-icon">
                    <Users size={30} />
                  </span>
                  <span className="eyebrow">ANTES DE QUE AMANEZCA</span>
                  <h2>El plan empieza contigo.</h2>
                  <p>
                    Comparte el código <strong>{room.code}</strong>. Cada
                    jugador entra desde su propio celular o computadora.
                  </p>
                  <div className="lobby-count">
                    <b>{room.players.length}</b>
                    <span>
                      / {room.rules.maxPlayers}
                      <small>jugadores en la sala</small>
                    </span>
                  </div>
                  {hostButtons(
                    <button
                      className="primary"
                      disabled={
                        disabled ||
                        room.players.length < room.rules.minPlayers ||
                        room.players.some((p) => !p.connected)
                      }
                      onClick={() => action('start-game')}
                    >
                      Comenzar la fuga <ArrowRight size={18} />
                    </button>,
                  )}
                  <p className="muted">
                    Se necesitan al menos {room.rules.minPlayers} jugadores
                    conectados.
                  </p>
                </>
              )}
              {room.status === 'roleReveal' && (
                <>
                  {secret && !secret.ready ? (
                    <SecretRole
                      secret={secret}
                      onReady={() => action('ready-role')}
                      disabled={disabled}
                    />
                  ) : (
                    <>
                      <span className="section-icon">
                        <Eye size={30} />
                      </span>
                      <h2>Tu secreto está a salvo.</h2>
                      <p>Espera a que todos conozcan su papel.</p>
                    </>
                  )}
                  {me && (
                    <>
                      <p className="muted">
                        Tu credencial es pública y no revela tu rol.
                      </p>
                      <CredentialCard player={me} />
                    </>
                  )}
                  <Waiting
                    count={room.readyCount}
                    total={room.players.length}
                    verb="conocen su rol"
                  />
                </>
              )}
              {room.status !== 'waiting' &&
                room.status !== 'roleReveal' &&
                room.status !== 'finished' && (
                  <>
                    <MissionProgress room={room} />
                    <div className="round-label">
                      <span className="eyebrow">
                        MISIÓN {room.currentMission + 1} DE{' '}
                        {room.missions.length}
                      </span>
                      <span className="target-chip">
                        Meta: {mission?.requiredPoints} puntos
                      </span>
                    </div>
                  </>
                )}
              {room.status === 'missionBrief' && (
                <>
                  <h2>
                    {mission?.icon} {mission?.name}
                  </h2>
                  <p>{mission?.description}</p>
                  <div className="tip">
                    Cada jugador resolverá una secuencia de memoria. Ayuda
                    correcta: +{room.rules.helpPoints}; error o ausencia de
                    respuesta: +{room.rules.minimumPoints}. Un sabotaje exitoso
                    aporta {room.rules.sabotagePoints}. Si el guarda intenta
                    sabotear y falla, puede dejar una pista.
                  </div>
                  <p className="muted">
                    Preparen sus pantallas antes de comenzar. Los tiempos siguen
                    corriendo al desconectarse.
                  </p>
                  {hostButtons(
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => action('continue-game')}
                    >
                      Comenzar actividades <ArrowRight size={18} />
                    </button>,
                  )}
                </>
              )}
              {room.status === 'mission' && (
                <>
                  <h2>
                    {mission?.icon} {mission?.name}
                  </h2>
                  <p>{mission?.description}</p>
                  {secret?.activity ? (
                    <MemoryActivity
                      key={secret.activity.id}
                      activity={secret.activity}
                      role={secret.role}
                      mission={room.currentMission}
                      rules={room.rules}
                      disabled={disabled}
                      onChoose={(mode) => {
                        void send('choose-activity', {
                          activityId: secret.activity!.id,
                          mode,
                        });
                      }}
                      onSubmit={(answer) => {
                        void send('submit-activity', {
                          activityId: secret.activity!.id,
                          answer,
                        });
                      }}
                    />
                  ) : (
                    <p className="muted">Recuperando tu actividad privada…</p>
                  )}
                  <Waiting
                    count={room.completedActivities}
                    total={room.players.length}
                    verb="han terminado su actividad"
                  />
                </>
              )}
              {room.status === 'missionResult' && result && (
                <>
                  <span
                    className={`result-tag ${result.success ? 'success' : 'failure'}`}
                  >
                    {result.success ? '✓ MISIÓN SUPERADA' : '× MISIÓN FALLIDA'}
                  </span>
                  <h2>
                    {result.success
                      ? 'Un paso hacia la libertad.'
                      : 'Algo salió mal…'}
                  </h2>
                  <p>
                    Estas son las contribuciones del equipo, mezcladas y sin
                    nombres.
                  </p>
                  <div className="contribution-cards">
                    {result.cards.map((value, i) => (
                      <GameCard key={i} card={{ id: String(i), value }} />
                    ))}
                  </div>
                  <div className="score">
                    <b>{result.total}</b>
                    <span>/ {result.requiredPoints} puntos necesarios</span>
                  </div>
                  <p>
                    {result.cards.some((v) => v < 0)
                      ? 'Hubo un sabotaje. ¿Quién estará detrás?'
                      : 'Todas las contribuciones fueron positivas; eso no demuestra inocencia.'}
                  </p>
                  <div className="tip evidence-result" role="status">
                    {result.clue ? (
                      <>
                        🔎 Nueva pista: <strong>{result.clue.text}</strong>
                      </>
                    ) : result.evidence === 'exhausted' ? (
                      'La investigación no encontró nuevos detalles: todas las características disponibles ya se conocen.'
                    ) : (
                      'No se encontraron nuevas pistas en esta misión.'
                    )}
                  </div>
                  {hostButtons(
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => action('continue-game')}
                    >
                      Abrir discusión <ArrowRight size={18} />
                    </button>,
                  )}
                </>
              )}
              {room.status === 'discussion' && (
                <>
                  <span className="section-icon">
                    <ShieldQuestion size={30} />
                  </span>
                  <h2>Es hora de atar cabos.</h2>
                  <p>
                    Consulten las pistas y credenciales del tablero. Hablen en
                    persona o por llamada: ¿quién coincide con toda la
                    evidencia?
                  </p>
                  <div className="tip">
                    Quedan{' '}
                    <strong>{room.accusationsRemaining} acusaciones</strong>.
                    Necesitan más de la mitad de los votos para revelar a un
                    sospechoso. Una votación sin mayoría también consume una
                    oportunidad.
                  </div>
                  {hostButtons(
                    <>
                      <button
                        className="primary"
                        disabled={disabled || !room.accusationsRemaining}
                        onClick={() => action('start-voting')}
                      >
                        Acusar a un sospechoso
                      </button>
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => action('continue-game')}
                      >
                        {room.currentMission === room.missions.length - 1 ||
                        room.failedMissions >= room.rules.maxFailedMissions ||
                        room.successfulMissions >= room.rules.requiredSuccesses
                          ? 'Ver desenlace'
                          : 'Continuar sin acusar'}
                        <ArrowRight size={16} />
                      </button>
                    </>,
                  )}
                </>
              )}
              {room.status === 'voting' && (
                <>
                  <h2>¿Quién es el guarda?</h2>
                  <p>
                    Elige con cuidado. Tu voto será secreto y no podrás
                    cambiarlo.
                  </p>
                  {!secret?.hasVoted ? (
                    <>
                      <div className="vote-options">
                        {room.players
                          .filter((p) => p.id !== session?.playerId)
                          .map((p) => (
                            <button
                              className={target === p.id ? 'chosen' : ''}
                              key={p.id}
                              disabled={disabled}
                              aria-pressed={target === p.id}
                              onClick={() => setTarget(p.id)}
                            >
                              <span>{p.avatar}</span>
                              {p.name}
                              {target === p.id && <Check size={18} />}
                            </button>
                          ))}
                      </div>
                      <button
                        className="primary"
                        disabled={
                          disabled ||
                          !room.players.some(
                            (p) =>
                              p.id === target && p.id !== session?.playerId,
                          )
                        }
                        onClick={() => {
                          void send('submit-vote', { targetId: target });
                        }}
                      >
                        Confirmar voto secreto
                      </button>
                    </>
                  ) : (
                    <div className="submitted">
                      <Check />
                      <p>Tu voto está guardado.</p>
                    </div>
                  )}
                  <Waiting
                    count={room.submittedVotes}
                    total={room.players.length}
                    verb="han votado"
                  />
                </>
              )}
              {room.status === 'voteResult' && room.voteResult && (
                <>
                  <span className="eyebrow">EL EQUIPO HA HABLADO</span>
                  <h2>
                    {room.voteResult.accusedId
                      ? room.voteResult.wasGuard
                        ? '¡Encontraron al guarda!'
                        : 'Era un animal inocente.'
                      : 'No hay mayoría absoluta.'}
                  </h2>
                  <p>
                    {room.voteResult.accusedId
                      ? `${room.players.find((p) => p.id === room.voteResult!.accusedId)?.name} recibió la mayoría de los votos.`
                      : 'Nadie recibió más de la mitad de los votos.'}{' '}
                    Nadie queda eliminado.
                  </p>
                  <div className="vote-tally">
                    {room.players.map((p) => (
                      <div key={p.id}>
                        <span>
                          {p.avatar} {p.name}
                        </span>
                        <strong>
                          {room.voteResult!.counts[p.id] ?? 0} votos
                        </strong>
                      </div>
                    ))}
                  </div>
                  {hostButtons(
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => action('continue-game')}
                    >
                      Continuar <ArrowRight size={18} />
                    </button>,
                  )}
                </>
              )}
              {room.status === 'finished' && (
                <div className="game-result">
                  <span className="role-emoji">
                    {room.winner === 'animal'
                      ? '🐯 🐵 🦁'
                      : room.winner === 'guard'
                        ? '🕵️'
                        : '🌙'}
                  </span>
                  <span className="eyebrow">FIN DE LA EXPEDICIÓN</span>
                  <h2>
                    {room.winner === 'animal'
                      ? '¡Los animales ganaron!'
                      : room.winner === 'guard'
                        ? '¡El guarda ha ganado!'
                        : 'La fuga quedó en pausa.'}
                  </h2>
                  <p>{room.reason}</p>
                  {room.guardIds.length > 0 && (
                    <div className="tip">
                      El guarda era:{' '}
                      <strong>
                        {room.players
                          .filter((p) => room.guardIds.includes(p.id))
                          .map((p) => p.name)
                          .join(', ')}
                      </strong>
                    </div>
                  )}
                  <MissionProgress room={room} />
                  {hostButtons(
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => action('play-again')}
                    >
                      Jugar otra vez <ArrowRight size={18} />
                    </button>,
                  )}
                </div>
              )}
            </section>
            <aside className="sidebar">
              <section className="panel crew-panel">
                <div className="panel-title">
                  <h3>La manada</h3>
                  <span>
                    {room.players.length} / {room.rules.maxPlayers}
                  </span>
                </div>
                <PlayerList
                  players={room.players}
                  hostId={room.hostId}
                  me={session?.playerId}
                />
              </section>
              {room.status !== 'waiting' && (
                <section className="panel mission-stats">
                  <h3>El estado de la fuga</h3>
                  <div>
                    <span>Misiones superadas</span>
                    <b>
                      {room.successfulMissions} / {room.rules.requiredSuccesses}
                    </b>
                  </div>
                  <div>
                    <span>Misiones fallidas</span>
                    <b>
                      {room.failedMissions} / {room.rules.maxFailedMissions}
                    </b>
                  </div>
                  <div>
                    <span>Acusaciones restantes</span>
                    <b>{room.accusationsRemaining}</b>
                  </div>
                  {secret?.role && room.status !== 'finished' && (
                    <>
                      <button
                        className="text-button"
                        onClick={() => setShowRole((v) => !v)}
                      >
                        <Eye size={16} />
                        {showRole ? 'Ocultar mi rol' : 'Consultar mi rol'}
                      </button>
                      {showRole && (
                        <p className="private-note">
                          {secret.role === 'guard'
                            ? '🕵️ Eres el guarda encubierto.'
                            : '🐾 Eres un animal.'}
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}
              <div className="sidebar-note">
                <Leaf size={22} />
                <p>
                  Confía en tu instinto.
                  <br />
                  No en todas las sonrisas.
                </p>
              </div>
            </aside>
          </div>
          {room.status !== 'waiting' && <InvestigationBoard room={room} />}
        </main>
      )}
      <footer className={room ? 'game-footer' : 'site-footer'}>
        <span>
          <PawPrint size={14} />{' '}
          {room
            ? 'HECHO PARA JUGAR JUNTOS'
            : 'Fuga en el Zoológico · Equipo #3 · 2026'}
        </span>
        {!room && <span>Sin cuentas. Solo tu manada.</span>}
      </footer>
      {rules && (
        <Modal titleId="rules-title" onClose={() => setRules(false)}>
          <button
            autoFocus
            className="modal-close icon-button"
            aria-label="Cerrar reglas"
            onClick={() => setRules(false)}
          >
            <X />
          </button>
          <span className="eyebrow">GUÍA DE CAMPO</span>
          <h2 id="rules-title">El plan de escape</h2>
          <ol>
            <li>
              Reúnan de 4 a 6 jugadores, cada uno con su pantalla. Uno será el
              guarda encubierto.
            </li>
            <li>
              Cada jugador tiene una credencial pública: pulsera, símbolo y
              herramienta. Las características se comparten; la combinación
              completa es única y no depende del rol.
            </li>
            <li>
              En cada misión memoriza una secuencia y reprodúcela. Una respuesta
              correcta aporta +2; un error o no responder aporta +1.
            </li>
            <li>
              El guarda puede ayudar o intentar una secuencia de sabotaje más
              larga. Si acierta aporta −2; si falla aporta +1 y deja una pista
              verdadera, si quedan detalles nuevos. No elegir acción aporta +1
              sin pista.
            </li>
            <li>
              La meta de la misión equivale al número de jugadores. Las
              contribuciones se revelan mezcladas; nadie ve quién hizo cada
              actividad.
            </li>
            <li>
              Al resolver la misión, consulten las pistas. La primera deja
              varios sospechosos; combinen la evidencia con las credenciales.
              Una misión exitosa no demuestra inocencia.
            </li>
            <li>
              Pueden votar a un sospechoso. Hace falta más de la mitad de los
              votos. Hay 2 acusaciones; votar sin mayoría también consume una.
              Nadie queda eliminado.
            </li>
            <li>
              Los animales ganan al superar 3 de 4 misiones o descubrir al
              guarda. El guarda gana con 2 fallos, al agotarse las acusaciones
              sin descubrirlo o al terminar sin completar la fuga.
            </li>
            <li>
              Los tiempos siguen corriendo aunque recargues. Reconectar recupera
              la misma actividad, sin otro intento ni tiempo extra. No se
              guardan las respuestas sin enviar.
            </li>
          </ol>
          <p className="muted">
            Después de cada misión hay una última discusión y una posible
            acusación antes de evaluar el desenlace.
          </p>
          <button className="primary" onClick={() => setRules(false)}>
            Tengo un plan <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {leaving && (
        <Modal titleId="leave-title" onClose={() => setLeaving(false)}>
          <h2 id="leave-title">¿Abandonar el campamento?</h2>
          <p>
            {room?.status === 'waiting' || room?.status === 'finished'
              ? 'Podrás unirte de nuevo mientras la sala esté esperando.'
              : 'Si sales, la partida se cancelará para todos. Si solo pierdes conexión, tienes 90 segundos para volver.'}
          </p>
          <div className="actions">
            <button
              autoFocus
              className="secondary"
              onClick={() => setLeaving(false)}
            >
              Seguir jugando
            </button>
            <button
              className="primary"
              disabled={disabled}
              onClick={async () => {
                if (await send('leave-room', undefined)) {
                  setLeaving(false);
                  setPage('home');
                }
              }}
            >
              Abandonar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function RadioIcon() {
  return (
    <span className="tiny-radio" aria-hidden="true">
      ◉
    </span>
  );
}
