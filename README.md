# Fuga en el Zoológico

Juego de mesa digital de roles ocultos para **4 a 6 jugadores**, cada uno en su propio celular o computadora. Un guarda encubierto intenta frustrar la fuga. El resto de la manada coopera, resuelve actividades de memoria, combina pistas verificables y decide a quién acusar.

**No utiliza ninguna base de datos.** Las salas y sus secretos viven únicamente en la memoria de un proceso Node.js. Reiniciar o desplegar el servidor elimina las partidas existentes.

## Arquitectura

```text
fuga-zoologico/
├── client/
│   ├── src/
│   │   ├── components/GameParts.tsx  # Contribuciones anónimas, jugadores y rol
│   │   ├── components/MemoryActivity.tsx # Secuencia privada y respuesta
│   │   ├── components/CredentialCard.tsx # Credencial pública
│   │   ├── components/InvestigationBoard.tsx # Pistas y candidatos
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
│   │   ├── game/activity.ts         # Desafíos, etapas y plazos
│   │   ├── game/investigation.ts    # Asignación de credenciales y pistas
│   │   ├── utils/random.ts         # Mezcla criptográfica
│   │   ├── app.ts                  # Express, eventos y limpieza
│   │   └── index.ts                # Puerto, orígenes y cierre del proceso
│   ├── test/                       # Pruebas de reglas y clientes Socket.IO
│   └── .env.example
├── shared/protocol.ts              # Contrato TypeScript sin secretos internos
├── shared/investigation.ts         # Símbolos y filtrado de candidatos públicos
├── package.json                    # npm workspaces
├── vercel.json
└── render.yaml
```

El cliente usa React, Vite, TypeScript, CSS, Lucide y Socket.IO Client. El servidor usa Node.js, Express, TypeScript y Socket.IO. No se necesita React Router: la fase autoritativa del servidor determina la pantalla. `shared/` contiene tipos y no importa código del motor al navegador.

## Temas y créditos

El botón de luna/sol del encabezado alterna entre modo claro y oscuro en todas las pantallas, incluidos formularios, cartas, resultados y modales. En la primera visita se respeta `prefers-color-scheme`; una elección manual se guarda como `light` o `dark` en la clave **`fuga-theme`** de `localStorage` y tiene prioridad sobre el sistema. Las pestañas abiertas sincronizan esa preferencia. Si el navegador bloquea el almacenamiento, el selector funciona durante la visita.

La paleta está centralizada en `client/src/themes.css` mediante variables semánticas y `data-theme` en `<html>`. `client/public/theme-init.js` aplica el tema antes del primer render para evitar un destello del tema incorrecto; `useTheme.ts` gestiona los cambios posteriores. Las transiciones duran 200 ms y se desactivan con `prefers-reduced-motion`.

**Créditos** se abre desde «Conoce al equipo · Créditos» en Home y regresa con «Volver al Home», usando la navegación por estado existente. `pages/Credits.tsx` contiene la información académica del Equipo #3 y utiliza `TeamMemberCard` para los cuatro integrantes. Las tarjetas se muestran en una columna en celular y dos a partir de 768 px. El footer académico aparece fuera de la partida; durante el juego se mantiene compacto.

Estas preferencias son exclusivamente visuales: no cambian reglas, eventos Socket.IO, sesiones ni datos del servidor.

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

## Reglas del MVP: actividades e investigación

1. El anfitrión inicia con 4–6 jugadores conectados. El servidor asigna **un guarda** y credenciales públicas independientes del rol.
2. Cada participante confirma su rol secreto. El anfitrión presenta la misión y pulsa **Comenzar actividades** cuando todos estén preparados.
3. Todos tienen 20 segundos para comenzar. El animal inicia ayuda; el guarda elige en secreto ayudar o sabotear. No elegir aporta +1 y no produce una pista.
4. Se muestra una secuencia durante 8 segundos: **4 símbolos para ayuda, 6 para sabotaje**. Después se oculta y hay 45 segundos para reproducirla. Se puede corregir antes de enviar, pero solo se acepta un envío completo.
5. El servidor compara la respuesta con su desafío y calcula la contribución:

| Acción                  | Correcta      | Incorrecta o vencida                    |
| ----------------------- | ------------- | --------------------------------------- |
| Ayuda (animal o guarda) | +2            | +1, sin pista                           |
| Intento de sabotaje     | −2, sin pista | +1 y una pista nueva si quedan detalles |
| No elegir acción        | —             | +1, sin pista                           |

6. Solo se publica cuántos participantes terminaron. Al finalizar todos, las contribuciones se mezclan y se muestran sin nombres. **La meta equivale al número de jugadores: 4, 5 o 6 puntos.**
7. Las pistas del sabotaje fallido se publican con el resultado, nunca cuando responde el guarda. El equipo consulta el tablero, discute y puede acusar o continuar.
8. Una acusación exige **más de la mitad de todos los votos**. Hay 2 oportunidades; una votación sin mayoría también consume una. Una mayoría revela si el acusado es guarda, pero no elimina jugadores.
9. Los animales ganan al identificar al guarda o lograr **3 misiones superadas de 4**. El guarda gana con **2 fallos**, con 2 acusaciones infructuosas o al llegar al final sin completar la fuga.
10. Se conserva este orden: resultado → discusión → acusación opcional → evaluación de victoria → próxima misión. Una acusación acertada tiene prioridad; una acusación que agota las oportunidades sin acertar da la victoria al guarda. Sin votación, se evalúan éxitos, fallos y fin de misiones.
11. Reiniciar desde el resultado devuelve al lobby y elimina pistas, credenciales y desafíos; el siguiente inicio asigna todo de nuevo.

Las cuatro misiones siguen siendo cerradura, cámaras, llave y salida. Usan el mismo minijuego modular con instrucciones temáticas diferentes. Se **sustituyó** la elección manual de cartas: `GameCard` representa ahora las contribuciones del resultado.

### Credenciales y evidencia

Cada credencial tiene pulsera (azul/ámbar), símbolo (hoja/luna) y herramienta (llave inglesa/linterna). Se muestra texto junto a los iconos para no depender del color.

El servidor utiliza patrones binarios distintos para 4, 5 y 6 participantes. Cada valor de cada columna aparece al menos dos veces; ninguna fila completa se repite. Mezcla filas, columnas y etiquetas independientemente del rol. No se elige una credencial especial para el guarda.

Al fallar un sabotaje, el servidor elige una característica verdadera y todavía no revelada. Prioriza la que más reduce los candidatos compatibles con la evidencia acumulada. La primera siempre deja al menos dos; las siguientes pueden identificar a una sola persona. Después de revelar las tres características, otro fallo indica que no hay nuevos detalles.

El tablero utiliza exclusivamente `players[].credential` y `clues` públicos. No consulta roles. Nadie es acusado automáticamente. Una misión exitosa puede contener un sabotaje; una ayuda correcta no demuestra inocencia; no encontrar pistas no significa que no haya guarda.

### Configuración y balance inicial

Modifica `server/src/game/gameConfig.ts`:

| Valor                         | Predeterminado | Uso                                        |
| ----------------------------- | -------------- | ------------------------------------------ |
| `MIN_PLAYERS` / `MAX_PLAYERS` | 4 / 6          | Capacidad compatible con credenciales      |
| `NUMBER_OF_GUARDS`            | 1              | El motor exige exactamente uno en este MVP |
| `MAX_FAILED_MISSIONS`         | 2              | Derrota por fallos                         |
| `MAX_ACCUSATIONS`             | 2              | Votaciones disponibles                     |
| `REQUIRED_SUCCESSES`          | 3              | Misiones superadas para escapar            |
| `POINTS_PER_PLAYER`           | 1              | Meta por jugador                           |
| `HELP_POINTS`                 | 2              | Ayuda correcta                             |
| `MINIMUM_POINTS`              | 1              | Fallo, vencimiento o no elegir             |
| `SABOTAGE_POINTS`             | −2             | Sabotaje correcto                          |
| `ACTIVITY_CHOICE_TIME`        | 20 segundos    | Preparación/decisión privada               |
| `ACTIVITY_MEMORIZE_TIME`      | 8 segundos     | Mostrar símbolos                           |
| `ACTIVITY_ANSWER_TIME`        | 45 segundos    | Responder después de memorizar             |
| `HELP_SEQUENCE_LENGTH`        | 4              | Longitud normal                            |
| `SABOTAGE_SEQUENCE_LENGTH`    | 6              | Longitud más difícil                       |
| `RECONNECT_GRACE_TIME`        | 90 segundos    | Plazo de reconexión                        |
| `ROOM_CLEANUP_TIME`           | 5 minutos      | Conservación del resultado final           |
| `ROOM_IDLE_TIME`              | 1 hora         | Límite de inactividad                      |
| `MAX_ROOMS`                   | 500            | Límite de salas                            |
| `TICK_INTERVAL`               | 250 ms         | Revisión de plazos y limpieza              |

Son los valores solicitados como **balance inicial**, no un equilibrio demostrado. Con +1 por omisión y meta igual al número de jugadores, una ronda donde nadie actúa supera la misión. Un sabotaje también puede ser insuficiente si los demás ayudan correctamente. Ajustar metas, contribuciones y dificultad después de partidas reales; los tests verifican reglas, no diversión o equilibrio.

`missionTemplates` permite editar misiones. Mantén el objetivo de éxitos dentro del número de misiones y usa tiempos positivos, razonables y una secuencia de sabotaje más larga. La guía inicial describe los valores predeterminados; los números de la sala se reciben del servidor. Agregar más guardas o tamaños de sala exige rediseñar la inferencia de pistas.

## Eventos, tiempos y privacidad

Todos los eventos cliente → servidor usan un ACK `{ ok, error?, session? }`.

| Evento            | Datos                    | Efecto                                               |
| ----------------- | ------------------------ | ---------------------------------------------------- |
| `create-room`     | `{ name }`               | Crea sala                                            |
| `join-room`       | `{ code, name }`         | Une participante                                     |
| `resume-session`  | Sesión con token         | Recupera la misma sesión                             |
| `start-game`      | —                        | Asigna roles y credenciales                          |
| `ready-role`      | —                        | Confirma el rol                                      |
| `continue-game`   | —                        | Anfitrión inicia actividades o avanza las fases      |
| `choose-activity` | `{ activityId, mode }`   | Elige ayuda o sabotaje privado                       |
| `submit-activity` | `{ activityId, answer }` | Envía los índices de la secuencia, no una puntuación |
| `start-voting`    | —                        | Convoca acusación                                    |
| `submit-vote`     | `{ targetId }`           | Voto secreto                                         |
| `leave-room`      | —                        | Abandona                                             |
| `play-again`      | —                        | Reinicia el lobby                                    |

Se retiró `play-card`. La fase nueva `missionBrief` presenta cada misión antes de iniciar su reloj. Dentro de `mission`, cada actividad privada pasa por `choice → memorize → answer → done`.

- `room-updated`: jugadores y credenciales públicas, contador agregado de actividades, pistas publicadas y resultados anónimos. No contiene desafíos, decisiones, tiempos individuales, respuestas, roles ni tokens. El guarda solo se confirma por mayoría y se identifica al finalizar.
- `private-state`: exclusivamente al socket del dueño. Rol, confirmaciones y actividad propia. La secuencia solo se envía mientras está en `memorize`; después se omite, incluso al reconectar.
- `room-closed`: caducidad o sustitución de sesión.

El servidor valida la fase, identidad de la actividad, pertenencia al jugador, rol necesario para sabotear, tipo/longitud de respuesta y plazo. Responder antes de memorizar, después de vencer, con otro desafío o por segunda vez se rechaza. La elección no puede cambiarse. Los plazos se revisan también al recibir respuestas, sin depender de cuándo corra el siguiente tick.

El cliente usa la hora privada del servidor y un reloj monotónico solo para mostrar el contador; nunca calcula el resultado. Las respuestas y decisiones no se envían a otros jugadores. Las pistas se calculan únicamente al resolver todas las actividades, evitando notificaciones individuales de sabotaje.

**Límite antitrampas:** la secuencia necesariamente llega al navegador para mostrarla. Alguien que inspeccione su propio tráfico puede copiarla. No se presenta este MVP como protección contra esa conducta, pero el servidor siempre comprueba respuestas y conserva la autoridad sobre puntos, pistas y victorias.

Se mantienen el límite de 35 acciones por 10 segundos por conexión, paquetes de 8 KiB y orígenes autorizados por CORS/handshake.

## Memoria, desconexiones y abandono

`GameEngine.rooms` es un `Map<string, GameRoom>`. Nunca se serializa a archivos ni a servicios externos.

- `localStorage` guarda `roomCode`, `playerId`, `playerName` y un token aleatorio de reconexión. **No guarda roles, desafíos, respuestas ni votos**. El token es una credencial: no se comparte con otros jugadores.
- Al perder conexión, el jugador conserva su lugar durante 90 segundos. Los relojes siguen corriendo y las actividades vencidas se resuelven con la contribución mínima definida; no se inventan votos.
- El anfitrión se transfiere inmediatamente al siguiente jugador conectado. Recuperar la conexión no expulsa al anfitrión sustituto.
- Al recargar se presenta el token y el servidor recupera el mismo rol, credencial, desafío, decisión y contribución registrada. No concede otro intento ni reinicia plazos. Una respuesta parcial aún sin enviar se pierde. Abrir esa sesión en otra pestaña sustituye la conexión anterior.
- Salir voluntariamente elimina al jugador. Si una partida está activa, se cancela sin ganador; esta misma regla se aplica al agotar el plazo de reconexión. Los demás pueden reiniciar con al menos 4 participantes.
- La sala se elimina al quedarse sin participantes. Si todos perdieron la red, primero se respeta su plazo de reconexión. Las salas terminadas caducan tras 5 minutos y las inactivas tras una hora. La limpieza se revisa cada 250 ms. Si coinciden una baja definitiva y un vencimiento, la cancelación por abandono tiene prioridad sobre resolver la misión.

## Pruebas y compilación

```sh
npm test
npm run build
```

Las pruebas cubren reglas, 4–6 participantes, privacidad, votos duplicados, actividades ajenas, plazos, credenciales, evidencia acumulativa, fases incorrectas, victorias, sesiones inválidas, transferencia de anfitrión y limpieza. La prueba de integración levanta un servidor real en un puerto temporal y conecta cuatro clientes Socket.IO, reconecta uno y completa una partida.

Prueba de interfaz con cuatro sesiones de navegador independientes:

```sh
npm run test:e2e
```

En Windows usa Microsoft Edge instalado. En Linux/macOS instala primero el navegador con `npx playwright install chromium`. La prueba inicia y cierra sus servidores en los puertos 3011 y 5175, juega tres misiones con pistas, reinicia y completa otra con votación, recarga una sesión, comprueba tamaños de móvil/tablet/escritorio y genera capturas en `previews/`. No debe haber otros procesos usando esos puertos.

`npm run format` aplica el formato del proyecto y `npm run format:check` lo verifica.

Las pruebas de navegador también comprueban el tema inicial del sistema, la persistencia manual, la sincronización entre pestañas, el almacenamiento bloqueado y movimiento reducido. Verifican Créditos en 375, 768 y 1280 px con ambas paletas y un contraste de texto mínimo de 4.5:1 en las combinaciones semánticas principales. El recorrido multijugador incluye cambiar el tema mientras se memoriza y completar una acusación en modo oscuro. Las capturas nuevas se guardan en `previews/credits-{light|dark}-{ancho}.png`, `previews/memory-mobile.png` y `previews/voting-dark.png`. El tablero se captura en `previews/investigation-desktop.png` y `previews/investigation-mobile.png`.

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
