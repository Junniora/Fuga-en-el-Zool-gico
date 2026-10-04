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

export default function App() {
  const game = useGame();
  const { theme, toggleTheme } = useTheme();
  const { room, secret, session, connected, restoring, busy, send } = game;
  const [page, setPage] = useState<'home' | 'create' | 'join' | 'credits'>(
    'home',
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [card, setCard] = useState('');
  const [target, setTarget] = useState('');
  const [rules, setRules] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const host = room?.hostId === session?.playerId;
  const disabled = busy || !connected || restoring;
  const mission = room?.missions[room.currentMission];
  const result = room?.history.at(-1);
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
              {room.status === 'mission' && (
                <>
                  <h2>
                    {mission?.icon} {mission?.name}
                  </h2>
                  <p>{mission?.description}</p>
                  <div className="hand-heading">
                    <h3>
                      {secret?.hasPlayed
                        ? 'Tu carta está sobre la mesa.'
                        : 'Elige tu movimiento'}
                    </h3>
                    <span>Tu mano es privada</span>
                  </div>
                  {!secret?.hasPlayed ? (
                    <>
                      <div className="hand">
                        {secret?.cards.map((c) => (
                          <GameCard
                            key={c.id}
                            card={c}
                            selected={card === c.id}
                            disabled={disabled}
                            onClick={() => setCard(c.id)}
                          />
                        ))}
                      </div>
                      <button
                        className="primary"
                        disabled={
                          disabled || !secret?.cards.some((c) => c.id === card)
                        }
                        onClick={() => {
                          void send('play-card', { cardId: card });
                        }}
                      >
                        Jugar carta en secreto <ArrowRight size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="submitted">
                      <Check size={25} />
                      <p>
                        Nadie sabe qué elegiste.
                        <br />
                        <strong>Espera al resto del equipo.</strong>
                      </p>
                    </div>
                  )}
                  <Waiting
                    count={room.submittedCards}
                    total={room.players.length}
                    verb="han elegido su carta"
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
                    Estas son las cartas del equipo, mezcladas y sin nombres.
                  </p>
                  <div className="result-cards">
                    {result.cards.map((value, i) => (
                      <span key={i} className={value < 0 ? 'negative' : ''}>
                        {value > 0 ? '+' : ''}
                        {value}
                      </span>
                    ))}
                  </div>
                  <div className="score">
                    <b>{result.total}</b>
                    <span>/ {result.requiredPoints} puntos necesarios</span>
                  </div>
                  <p>
                    {result.cards.some((v) => v < 0)
                      ? 'Hubo un sabotaje. ¿Quién estará detrás?'
                      : 'Todas las cartas fueron de ayuda. Mantengan los ojos abiertos.'}
                  </p>
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
                    Hablen entre ustedes, en persona o por llamada. ¿Qué salió
                    mal? ¿Quién está intentando ganarse su confianza?
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
            <li>Reúnan de 4 a 6 jugadores. Cada uno necesita una pantalla.</li>
            <li>Uno será el guarda encubierto. Mantengan su rol en secreto.</li>
            <li>
              En cada misión todos juegan una carta. Los animales ayudan; el
              guarda también puede sabotear.
            </li>
            <li>
              Se suman las cartas anónimas. Alcancen la meta para superar la
              misión. Recibirán una mano nueva en cada ronda.
            </li>
            <li>
              Discutan y decidan si quieren acusar. Más de la mitad debe votar
              por la misma persona. Hay 2 oportunidades; una votación sin
              mayoría también cuenta.
            </li>
            <li>
              Los animales ganan al descubrir al guarda o superar las 4
              misiones. El guarda gana con 3 fallos, 2 acusaciones infructuosas
              o una fuga incompleta al final.
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
