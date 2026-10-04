import { randomInt, randomUUID } from 'node:crypto';
import type { Clue, Credential, Player } from '../../../shared/protocol.js';
import {
  compatiblePlayers,
  credentialFields,
  credentialOptions,
} from '../../../shared/investigation.js';
import { shuffle } from '../utils/random.js';

// Each column value occurs at least twice, while every row is unique.
const codebooks: Record<number, string[]> = {
  4: ['000', '011', '101', '110'],
  5: ['000', '001', '010', '100', '111'],
  6: ['001', '010', '011', '100', '101', '110'],
};
export function assignCredentials(count: number): Credential[] {
  if (!codebooks[count])
    throw new Error('Las credenciales requieren de 4 a 6 participantes.');
  const columns = shuffle([0, 1, 2]);
  const flips = columns.map(() => randomInt(2));
  return shuffle(codebooks[count]).map(
    (bits) =>
      Object.fromEntries(
        credentialFields.map((field, i) => [
          field,
          credentialOptions[field][Number(bits[columns[i]]) ^ flips[i]].value,
        ]),
      ) as unknown as Credential,
  );
}
export function discoverClue(
  players: Player[],
  guard: Credential,
  previous: Clue[],
  missionId: number,
): Clue | null {
  const candidates = compatiblePlayers(players, previous);
  const options = shuffle([...credentialFields])
    .filter((field) => !previous.some((c) => c.field === field))
    .map((field) => ({
      field,
      remaining: candidates.filter((p) => p.credential![field] === guard[field])
        .length,
    }))
    .sort((a, b) => a.remaining - b.remaining);
  const best = options.find((o) => previous.length > 0 || o.remaining >= 2);
  if (!best) return null;
  const value = guard[best.field];
  const texts: Record<keyof Credential, string> = {
    wristband: `La cámara captó una pulsera ${value}.`,
    symbol: `Se encontró una marca con símbolo de ${value}.`,
    tool: `La herramienta utilizada fue: ${value}.`,
  };
  return {
    id: randomUUID(),
    missionId,
    field: best.field,
    value,
    text: texts[best.field],
  };
}
