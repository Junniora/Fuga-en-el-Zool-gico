export const gameConfig = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 6,
  NUMBER_OF_GUARDS: 1,
  MAX_FAILED_MISSIONS: 3,
  MAX_ACCUSATIONS: 2,
  REQUIRED_SUCCESSES: 4,
  ROOM_CLEANUP_TIME: 5 * 60_000,
  RECONNECT_GRACE_TIME: 90_000,
  ROOM_IDLE_TIME: 60 * 60_000,
  MAX_ROOMS: 500,
  POINTS_PER_PLAYER: 1.5,
};
export const missionTemplates = [
  {
    id: 1,
    name: 'Abrir la cerradura',
    description:
      'La noche es nuestra. Fuerza el candado de la jaula sin despertar al guarda.',
    icon: '🔓',
  },
  {
    id: 2,
    name: 'Desactivar las cámaras',
    description:
      'Cruza la zona de vigilancia y corta la señal antes de que te descubran.',
    icon: '📹',
  },
  {
    id: 3,
    name: 'Conseguir la llave',
    description:
      'La llave está en la caseta. Necesitamos unas patas rápidas y un buen plan.',
    icon: '🗝️',
  },
  {
    id: 4,
    name: 'Abrir la salida',
    description:
      'La libertad está al otro lado. Un último esfuerzo, todos juntos.',
    icon: '🚪',
  },
];
