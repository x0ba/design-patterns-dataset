// 模拟原生音频引擎：不输出声音，只按真实时钟推进播放位置并推送事件
import type { Track } from "@shared/types/player";

export const createPlayer = (emit: (e: unknown) => void, initialVolume: () => number) => {
  let state: "idle" | "playing" | "paused" = "idle";
  let position = 0;
  let duration = 0;
  let volume = initialVolume();
  let speed = 1;
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let current: Track | null = null;

  const pos = () => (state === "playing" ? Math.min(duration, position + (Date.now() - startedAt) * speed) : position);
  const status = () => ({ state, position: pos(), duration, volume, speed, isFinished: false });
  const pushStatus = () => emit({ type: "status", data: status() });
  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const play = () => {
    if (!current) return;
    position = pos();
    startedAt = Date.now();
    state = "playing";
    stopTimer();
    timer = setInterval(() => {
      const p = pos();
      emit({ type: "position", data: { position: p, duration } });
      if (p >= duration) {
        stopTimer();
        position = duration;
        state = "paused";
        emit({ type: "ended" });
      }
    }, 200);
    pushStatus();
    emit({ type: "play" });
  };
  const pause = () => {
    position = pos();
    state = "paused";
    stopTimer();
    pushStatus();
    emit({ type: "pause" });
  };

  const invoke = (channel: string, args: any[], devices: any[]) => {
    const ok = <T>(data?: T) => ({ success: true, data });
    switch (channel) {
      case "player:load": {
        const opts = args[1] ?? {};
        current = opts.meta ?? null;
        duration = current?.duration ?? 240000;
        position = 0;
        state = "paused";
        stopTimer();
        const q = current?.quality ?? { codec: "FLAC", sampleRate: 44100, bitRate: 1000000, channels: 2, bitsPerSample: 16 };
        const result = ok({
          detail: { quality: q, externalLyrics: [] },
          mediaInfo: { duration, quality: q },
        });
        pushStatus();
        if (opts.autoPlay ?? true) setTimeout(play, 0);
        return result;
      }
      case "player:play":
        play();
        return ok();
      case "player:pause":
        pause();
        return ok();
      case "player:stop":
        stopTimer();
        state = "idle";
        position = 0;
        pushStatus();
        return ok();
      case "player:seek":
        position = Math.max(0, Math.min(duration, args[0]));
        startedAt = Date.now();
        emit({ type: "seek", data: { position } });
        emit({ type: "position", data: { position, duration } });
        return ok();
      case "player:setVolume":
        volume = args[0];
        return ok();
      case "player:getVolume":
        return ok(volume);
      case "player:setSpeed":
        position = pos();
        startedAt = Date.now();
        speed = args[0];
        return ok();
      case "player:getStatus":
        return ok(status());
      case "player:getFadeDuration":
        return ok(200);
      case "player:getOutputDevices":
        return ok(devices);
      case "player:getDefaultDeviceName":
        return ok(devices[0].name);
      case "player:getSelectedDeviceName":
        return ok(null);
      case "player:getStreamInfo": {
        const q: any = current?.quality ?? {};
        return ok({
          codec: q.codec ?? "FLAC",
          sampleRate: q.sampleRate ?? 44100,
          channels: 2,
          bitsPerSample: q.bitsPerSample || 16,
          bitRate: q.bitRate ?? 0,
          outputSampleRate: 48000,
          outputChannels: 2,
          outputDevice: devices[0].name,
          exclusive: false,
        });
      }
      case "player:getFftData":
        return ok(null);
      case "player:getCoverRaw":
        return ok(current?.cover ?? null);
      case "player:readLyricFile":
        return ok(null);
      case "player:prepareNext":
        return { pcmReady: false, planReady: false };
      default:
        return ok();
    }
  };
  return { invoke };
};
