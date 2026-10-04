import type { Clue, Credential, Player } from './protocol.js';

export const credentialFields = ['wristband', 'symbol', 'tool'] as const;
export const credentialLabels: Record<keyof Credential, string> = {
  wristband: 'Pulsera',
  symbol: 'Símbolo',
  tool: 'Herramienta',
};
export const credentialOptions = {
  wristband: [
    { value: 'azul', icon: '🔵' },
    { value: 'ámbar', icon: '🟠' },
  ],
  symbol: [
    { value: 'hoja', icon: '🍃' },
    { value: 'luna', icon: '🌙' },
  ],
  tool: [
    { value: 'llave inglesa', icon: '🔧' },
    { value: 'linterna', icon: '🔦' },
  ],
};
export const memorySymbols = [
  { label: 'Hoja', icon: '🍃' },
  { label: 'Luna', icon: '🌙' },
  { label: 'Sol', icon: '☀️' },
  { label: 'Flor', icon: '🌸' },
] as const;

// Deliberately accepts public data only; no role or hidden identity is consulted.
export function compatiblePlayers(players: Player[], clues: Clue[]): Player[] {
  return players.filter(
    (p) =>
      p.credential && clues.every((c) => p.credential![c.field] === c.value),
  );
}
