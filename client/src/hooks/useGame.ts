import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientEvents,
  GameState,
  Payloads,
  PrivateState,
  Reply,
  ServerEvents,
  Session,
} from '../../../shared/protocol';
const key = 'fuga-session';
function saved(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}
export function useGame() {
  const socket = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [room, setRoom] = useState<GameState | null>(null);
  const [secret, setSecret] = useState<PrivateState | null>(null);
  const [session, setSession] = useState<Session | null>(saved);
  const [connected, setConnected] = useState(false);
  const [restoring, setRestoring] = useState(!!saved());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  function remember(value: Session | null) {
    setSession(value);
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
    } catch {
      /* A live session also works when storage is disabled. */
    }
  }
  useEffect(() => {
    const s: Socket<ServerEvents, ClientEvents> = io(
      import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
      { autoConnect: false, timeout: 10000 },
    );
    socket.current = s;
    s.on('connect', () => {
      setConnected(true);
      setError('');
      const previous = saved();
      if (previous) {
        setRestoring(true);
        s.timeout(10000).emit(
          'resume-session',
          previous,
          (err: Error | null, result: Reply) => {
            setRestoring(false);
            if (err) {
              setError(
                'No se pudo recuperar la sesión. Vuelve a intentar conectarte.',
              );
              s.disconnect().connect();
              return;
            }
            if (!result.ok) {
              remember(null);
              setRoom(null);
              setSecret(null);
              setError(result.error ?? 'Sesión caducada.');
            } else if (result.session) remember(result.session);
          },
        );
      } else setRestoring(false);
    });
    s.on('disconnect', () => {
      setConnected(false);
      setSecret(null);
    });
    s.on('connect_error', () => {
      setConnected(false);
      setError('No podemos conectar con el servidor. Reintentando…');
    });
    s.on('room-updated', setRoom);
    s.on('private-state', setSecret);
    s.on('room-closed', (reason) => {
      remember(null);
      setRoom(null);
      setSecret(null);
      setRestoring(false);
      setError(reason);
    });
    s.connect();
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, []);
  async function send<K extends keyof Payloads>(
    event: K,
    payload: Payloads[K],
  ): Promise<boolean> {
    if (!socket.current?.connected || lock.current || restoring) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    return new Promise((resolve) => {
      const emit = socket.current!.timeout(10000).emit as (
        name: K,
        data: Payloads[K],
        ack: (error: Error | null, reply: Reply) => void,
      ) => void;
      emit.call(
        socket.current!.timeout(10000),
        event,
        payload,
        (err, reply) => {
          lock.current = false;
          setBusy(false);
          if (err || !reply.ok) {
            setError(
              err
                ? 'La respuesta tardó demasiado. Comprueba el estado antes de repetir.'
                : (reply.error ?? 'No se pudo completar.'),
            );
            resolve(false);
            return;
          }
          if (reply.session) remember(reply.session);
          if (event === 'leave-room') {
            remember(null);
            setRoom(null);
            setSecret(null);
          }
          resolve(true);
        },
      );
    });
  }
  return {
    room,
    secret,
    session,
    connected,
    restoring,
    busy,
    error,
    setError,
    send,
    reconnect: () => socket.current?.connect(),
  };
}
