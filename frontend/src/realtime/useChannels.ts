// Joins both channels once per tab. Inbound world messages drain into
// roomStore; the returned `send` lets the rest of the app emit input
// messages on the inputs channel.

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  CHANNEL_INPUTS,
  CHANNEL_WORLD,
  INPUT_EVENT,
  WORLD_EVENT,
  type InputMessage,
  type WorldMessage,
  encodeInputMessage,
  decodeWorldMessage,
} from '@supatroppers/shared';
import { getSupabase, hasSupabaseConfig } from './client';
import { useRoomStore } from '../state/roomStore';

type Status = 'idle' | 'connecting' | 'ready' | 'error';

export type SendInput = (msg: InputMessage) => void;

export function useChannels(): { status: Status; send: SendInput } {
  const [status, setStatus] = useState<Status>('idle');
  const inputsRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setStatus('error');
      return;
    }

    const supabase = getSupabase();
    setStatus('connecting');

    const world = supabase.channel(CHANNEL_WORLD, { config: { broadcast: { self: false } } });
    world.on('broadcast', { event: WORLD_EVENT }, (payload) => {
      const msg = decodeWorldMessage(payload.payload);
      if (!msg) return;
      handleWorldMessage(msg);
    });

    const inputs = supabase.channel(CHANNEL_INPUTS, { config: { broadcast: { ack: false } } });
    inputsRef.current = inputs;

    let readyCount = 0;
    const onReady = () => {
      readyCount++;
      if (readyCount >= 2) setStatus('ready');
    };

    world.subscribe((s) => {
      if (s === 'SUBSCRIBED') onReady();
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
    });
    inputs.subscribe((s) => {
      if (s === 'SUBSCRIBED') onReady();
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
    });

    return () => {
      inputsRef.current = null;
      supabase.removeChannel(world);
      supabase.removeChannel(inputs);
    };
  }, []);

  const send: SendInput = (msg) => {
    const ch = inputsRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: INPUT_EVENT, payload: encodeInputMessage(msg) });
  };

  return { status, send };
}

function handleWorldMessage(msg: WorldMessage) {
  switch (msg.type) {
    case 'snapshot': {
      useRoomStore.getState().setSnapshot(msg);
      return;
    }
    case 'ping': {
      useRoomStore.getState().addPing(msg);
      return;
    }
  }
}
