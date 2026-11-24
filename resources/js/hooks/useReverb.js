import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance = null;

function getEcho() {
  if (!echoInstance) {
    window.Pusher = Pusher;
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
      wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
      wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
      forceTLS: false,
      enabledTransports: ['ws'],
    });
  }
  return echoInstance;
}

export function useReverb(channelName, eventName, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!channelName || !eventName) return;

    const echo = getEcho();
    const channel = echo.channel(channelName);
    channel.listen(eventName, (data) => callbackRef.current(data));

    return () => {
      channel.stopListening(eventName);
    };
  }, [channelName, eventName]);
}

export function usePrivateReverb(channelName, eventName, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!channelName || !eventName) return;

    const echo = getEcho();
    const channel = echo.private(channelName);
    channel.listen(eventName, (data) => callbackRef.current(data));

    return () => {
      channel.stopListening(eventName);
    };
  }, [channelName, eventName]);
}
