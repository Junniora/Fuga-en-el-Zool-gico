# Fuga en el Zoológico

Juego de mesa digital de roles ocultos para **4 a 6 jugadores**, cada uno en su propio celular o computadora. Un guarda encubierto intenta frustrar la fuga. El resto de la manada coopera, analiza cartas anónimas y decide a quién acusar.

**No utiliza ninguna base de datos.** Las salas y sus secretos viven únicamente en la memoria de un proceso Node.js. Reiniciar o desplegar el servidor elimina las partidas existentes.

## Arquitectura

```text
fuga-zoologico/
├── client/
│   ├── src/
│   │   ├── components/GameParts.tsx  # Cartas, jugadores, progreso y rol
│   │   ├── hooks/useGame.ts         # Socket, sesión, reconexión y errores
│   │   ├── App.tsx                  # Pantallas y fases del juego
│   │   ├── main.tsx
│   │   └── styles.css               # Interfaz adaptable y escena CSS
│   ├── .env.example
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── game/engine.ts           # Reglas y proyecciones públicas/privadas
│   │   ├── game/gameConfig.ts       # Configuración y misiones
│   │   ├── app.ts                  # Express, eventos y limpieza
│   │   └── index.ts                # Puerto, orígenes y cierre del proceso
│   ├── test/                       # Pruebas de reglas y clientes Socket.IO
│   └── .env.example
├── shared/protocol.ts              # Contrato TypeScript sin secretos internos
├── package.json                    # npm workspaces
├── vercel.json
└── render.yaml
```

El cliente usa React, Vite, TypeScript, CSS, Lucide y Socket.IO Client. El servidor usa Node.js, Express, TypeScript y Socket.IO. No se necesita React Router: la fase autoritativa del servidor determina la pantalla. `shared/` contiene tipos y no importa código del motor al navegador.

## Instalación y ejecución

Requisito: **Node.js 24** con npm. Desde esta carpeta:

```sh
npm install
```

Copia `client/.env.example` a `client/.env` y `server/.env.example` a `server/.env`. Puedes hacerlo con tu editor o, en PowerShell:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

Ejecuta ambas aplicaciones:

```sh
npm run dev
```

Abre **http://localhost:5173**. El backend escucha en **http://localhost:3001** y su comprobación de salud está en `/health`.

También puedes usar dos terminales independientes:

```sh
npm run dev -w server
```

```sh
npm run dev -w client
```

En PowerShell, si la política de ejecución bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`.

### Jugar desde varios celulares en la misma Wi-Fi

1. Obtén la IPv4 local de la computadora que ejecuta el servidor con `ipconfig` (por ejemplo `192.168.1.50`).
2. Configura `client/.env` con `VITE_SERVER_URL=http://192.168.1.50:3001`.
3. Configura `server/.env` con `CLIENT_URL=http://localhost:5173,http://192.168.1.50:5173`.
4. Reinicia `npm run dev` y permite los puertos 5173 y 3001 en el firewall de la red privada.
5. Todos abren `http://192.168.1.50:5173`. Uno crea sala y comparte el código; los demás se unen.

`localhost` en un celular apunta al propio celular, por lo que es necesario usar la IP de la computadora. Para jugar fuera de la misma red, despliega ambas aplicaciones. En una sola computadora puedes probar con perfiles de navegador o ventanas privadas independientes: las pestañas que comparten almacenamiento representan al mismo jugador.

## Reglas del MVP

- El anfitrión inicia con 4–6 jugadores conectados. Hay un guarda aleatorio.
- Cada participante ve su propio rol y confirma que lo entendió. Todos deben confirmar antes de jugar.
- Misiones: cerradura, cámaras, llave y salida. Meta por defecto: `ceil(jugadores × 1.5)` puntos (6, 8 o 9).
- Cada misión renueva la mano: animales `+1/+2/+3`; guarda también `-1/-2/-3`. Se elige exactamente una carta y no se puede cambiar.
- Solo se publica cuántas cartas se han enviado. Cuando todos terminan se publican valores mezclados, total y resultado, sin atribución.
- El anfitrión abre la discusión. Pueden hablar en persona o por una llamada externa; no hay chat integrado.
- Se puede continuar sin acusar o convocar una votación. Cada jugador elige a otro, una única vez. Solo se publica el progreso hasta que todos votan.
- **Más del 50 % de todos los jugadores** debe acusar a la misma persona para revelar si es guarda. Nunca se publica quién votó por quién. Nadie queda eliminado.
- Cada votación completa consume una de las **2 acusaciones**, incluso sin mayoría. Una acusación fallida permite continuar mientras quede una oportunidad.
- Los animales ganan al descubrir al guarda o superar las **4 misiones**. El guarda gana con **3 fallos**, al agotarse las acusaciones sin descubrirlo o al terminar las misiones sin completar la fuga.
- Orden deliberado: resultado → discusión → acusación opcional → evaluación de victoria → siguiente misión. Por tanto, hay una última oportunidad de descubrir al guarda después de la misión decisiva. En una votación, acertar tiene prioridad; agotar acusaciones sin acertar da la victoria al guarda. Sin votación, se evalúan primero los éxitos, después los fallos y el fin de las misiones.
- Al terminar, el anfitrión puede devolver la misma sala al lobby; el siguiente inicio reasigna todos los roles.

### Configuración

Modifica `server/src/game/gameConfig.ts`:

| Valor                         | Predeterminado | Uso                              |
| ----------------------------- | -------------- | -------------------------------- |
| `MIN_PLAYERS` / `MAX_PLAYERS` | 4 / 6          | Capacidad                        |
| `NUMBER_OF_GUARDS`            | 1              | Cantidad de guardas aleatorios   |
| `MAX_FAILED_MISSIONS`         | 3              | Derrota por fallos               |
| `MAX_ACCUSATIONS`             | 2              | Votaciones disponibles           |
| `REQUIRED_SUCCESSES`          | 4              | Misiones superadas para escapar  |
| `POINTS_PER_PLAYER`           | 1.5            | Meta de cada misión              |
| `RECONNECT_GRACE_TIME`        | 90 segundos    | Plazo de reconexión              |
| `ROOM_CLEANUP_TIME`           | 5 minutos      | Conservación del resultado final |
| `ROOM_IDLE_TIME`              | 1 hora         | Límite de inactividad            |
| `MAX_ROOMS`                   | 500            | Límite de salas en memoria       |

Las misiones se editan en `missionTemplates`. Mantén `REQUIRED_SUCCESSES` entre 1 y la cantidad de misiones. La interfaz de la sala recibe las reglas numéricas del servidor; la guía inicial describe los valores predeterminados. Si agregas varios guardas, la regla actual sigue concediendo la victoria al descubrir **cualquiera**. La política de acusaciones está encapsulada en `resolveAccusation`; las condiciones de victoria, en `continue`.

## Eventos y privacidad

Todos los eventos cliente → servidor reciben un ACK `{ ok, error?, session? }`.

| Evento           | Datos            | Efecto                           |
| ---------------- | ---------------- | -------------------------------- |
| `create-room`    | `{ name }`       | Crea sala y credencial           |
| `join-room`      | `{ code, name }` | Añade participante               |
| `resume-session` | Sesión con token | Recupera jugador tras reconectar |
| `start-game`     | —                | Anfitrión asigna roles           |
| `ready-role`     | —                | Confirma lectura privada         |
| `play-card`      | `{ cardId }`     | Envía una carta propia           |
| `continue-game`  | —                | Anfitrión avanza la fase         |
| `start-voting`   | —                | Anfitrión convoca acusación      |
| `submit-vote`    | `{ targetId }`   | Vota en secreto                  |
| `leave-room`     | —                | Abandona voluntariamente         |
| `play-again`     | —                | Anfitrión reinicia el lobby      |

Servidor → cliente:

- `room-updated`: proyección pública explícita. Jugadores sin roles, tokens ni manos; progreso, resultados anónimos y reglas. La identidad del guarda solo aparece al finalizar, o se confirma para el acusado cuando la mayoría lo identifica.
- `private-state`: enviado exclusivamente al socket del propietario. Rol, mano y confirmaciones propias.
- `room-closed`: avisa de caducidad o sustitución de sesión por otra pestaña.

El servidor valida identidad, rol, pertenencia de cartas, permisos de anfitrión, fase, capacidad, nombres, objetivos de voto y envíos duplicados. No acepta puntuaciones ni roles aportados por el cliente. Hay límite de 35 acciones por 10 segundos por conexión y paquetes de 8 KiB. CORS y el handshake solo admiten los orígenes configurados; los clientes sin encabezado Origin se admiten para herramientas nativas y pruebas.

## Memoria, desconexiones y abandono

`GameEngine.rooms` es un `Map<string, GameRoom>`. Nunca se serializa a archivos ni a servicios externos.

- `localStorage` guarda `roomCode`, `playerId`, `playerName` y un token aleatorio de reconexión. **No guarda roles, cartas ni votos**. El token es una credencial: no se comparte con otros jugadores.
- Al perder conexión, el jugador conserva su lugar durante 90 segundos. La partida espera las respuestas pendientes; nunca inventa cartas ni votos.
- El anfitrión se transfiere inmediatamente al siguiente jugador conectado. Recuperar la conexión no expulsa al anfitrión sustituto.
- Al recargar se presenta el token y el servidor recupera el mismo rol, mano y selección. Abrir esa sesión en otra pestaña sustituye la conexión anterior.
- Salir voluntariamente elimina al jugador. Si una partida está activa, se cancela sin ganador; esta misma regla se aplica al agotar el plazo de reconexión. Los demás pueden reiniciar con al menos 4 participantes.
- La sala se elimina al quedarse sin participantes. Si todos perdieron la red, primero se respeta su plazo de reconexión. Las salas terminadas caducan tras 5 minutos y las inactivas tras una hora. La limpieza se revisa cada segundo.

## Pruebas y compilación

```sh
npm test
npm run build
```

Las pruebas cubren reglas, 4–6 participantes, privacidad, votos duplicados, cartas ajenas, fases incorrectas, victorias, sesiones inválidas, transferencia de anfitrión y limpieza. La prueba de integración levanta un servidor real en un puerto temporal y conecta cuatro clientes Socket.IO, reconecta uno y completa una partida.

Prueba de interfaz con cuatro sesiones de navegador independientes:

```sh
npm run test:e2e
```

En Windows usa Microsoft Edge instalado. En Linux/macOS instala primero el navegador con `npx playwright install chromium`. La prueba inicia y cierra sus servidores en los puertos 3011 y 5175, juega las cuatro misiones, recarga una sesión, comprueba tamaños de móvil/tablet/escritorio y genera capturas en `previews/`. No debe haber otros procesos usando esos puertos.

`npm run format` aplica el formato del proyecto y `npm run format:check` lo verifica.

Para ejecutar el backend compilado:

```sh
npm run start -w server
```

El frontend compilado está en `client/dist`. `npm run preview -w client` sirve esa compilación localmente; añade su origen (normalmente `http://localhost:4173`) a `CLIENT_URL` para conectarla al backend.

## Variables de entorno

| Aplicación | Variable          | Desarrollo              |
| ---------- | ----------------- | ----------------------- |
| Cliente    | `VITE_SERVER_URL` | `http://localhost:3001` |
| Servidor   | `CLIENT_URL`      | `http://localhost:5173` |
| Servidor   | `PORT`            | `3001`                  |

`CLIENT_URL` acepta orígenes separados por comas, sin barra final. No uses `*` en producción. `VITE_SERVER_URL` se incorpora durante la compilación: cambiarla requiere recompilar y volver a desplegar el cliente. No contiene secretos.

## Despliegue en Render

Los archivos de despliegue suponen que **el contenido de `fuga-zoologico/` es la raíz del repositorio publicado**.

1. Sube esa carpeta a un repositorio Git.
2. Crea un Web Service Node en Render o usa `render.yaml` como Blueprint.
3. Build command: `npm ci --include=dev && npm run build -w server`.
4. Start command: `npm run start -w server`.
5. Define `CLIENT_URL=https://tu-proyecto.vercel.app` y Node 24. Render proporciona `PORT`; el servidor escucha en `0.0.0.0`.
6. Configura `/health` como comprobación de salud.
7. Mantén **una sola instancia/proceso**, sin cluster ni réplicas: las salas son locales a su memoria.

El servicio usa conexiones Socket.IO persistentes. Un despliegue reemplaza la instancia y corta conexiones; las partidas en memoria se pierden. Consulta [WebSockets en Render](https://render.com/docs/websocket) y [Web Services](https://render.com/docs/web-services). El arranque de un servicio dormido puede tardar; la interfaz reintenta la conexión.

## Despliegue en Vercel

1. Importa el mismo repositorio y selecciona su raíz, que debe contener `client/`, `server/`, `shared/` y `vercel.json`.
2. Usa el preset Vite. `vercel.json` fija instalación `npm ci`, build `npm run build -w client` y salida `client/dist`.
3. Define `VITE_SERVER_URL=https://tu-servidor.onrender.com` antes de compilar.
4. Despliega y copia el origen final a `CLIENT_URL` del backend. Reinicia el backend para aplicar el cambio.
5. Si usas un dominio personalizado o previews, añade cada origen autorizado explícitamente a `CLIENT_URL`.

Mantener la raíz del repositorio permite incluir los tipos compartidos; Vercel también documenta la [configuración de monorepos](https://vercel.com/docs/monorepos). El backend debe permanecer en Render para mantener el proceso y los sockets; el frontend estático se sirve desde Vercel.

Si conservas `fuga-zoologico/` como subcarpeta de un repositorio mayor, selecciona esa carpeta como Root Directory en ambas plataformas. Para el Blueprint, coloca `render.yaml` en la raíz del repositorio y añade `rootDir: fuga-zoologico` al servicio.

## Alcance

MVP sin cuentas, chat, audio, habilidades especiales ni persistencia. Los componentes gráficos se dibujan con CSS, iconos y emojis; estos últimos pueden variar entre sistemas. Las fuentes de Google tienen alternativas locales. El objetivo es jugar con una misma manada, con reglas verificadas por el servidor y sin requerir infraestructura de datos.
