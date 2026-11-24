"""
Offline stand-in for server/gemini_live.py (Gemini Live on Vertex AI).

Exposes the same `GeminiLive` class / `start_session` async generator and emits
the same event shapes the real module forwards to the browser:
  * binary PCM16 @ 24 kHz via audio_output_callback (the persona "speaking")
  * {"serverContent": {"inputTranscription"/"outputTranscription": {...}}}
    (only when the client enabled transcription, as with the real API)
  * {"serverContent": {"turnComplete": True}}
  * {"toolCall": {"functionCalls": [{"name": "complete_mission", ...}]}}

The conversation is a scripted roleplay chosen from dialogues.py by the
mission / target language / mode parsed out of the client's system prompt.
"""
import array
import asyncio
import inspect
import json
import logging
import math
import random
import re
import uuid
from typing import Callable, Dict, Optional

from dialogues import get_dialogue

logger = logging.getLogger(__name__)

OUT_RATE = 24000


def _strip_flag(lang: str) -> str:
    # "🇪🇸 Spanish" -> "Spanish"
    return re.sub(r"^[^A-Za-z]+", "", lang or "").strip() or "French"


def parse_setup(setup_config: Optional[Dict]) -> Dict:
    info = {"role": "a local", "language": "French", "from_language": "English",
            "mission": "Say Hello", "mode": "immersive",
            "input_tx": False, "output_tx": False}
    if not setup_config:
        return info
    try:
        text = setup_config["system_instruction"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        text = ""
    m = re.search(r"You are acting as \*\*(.+?)\*\*, a native speaker of (.+?)\.\n", text)
    if m:
        info["role"], info["language"] = m.group(1), _strip_flag(m.group(2))
    m = re.search(r"\(native speaker of (.+?)\) trying to: \"(.+?)\"", text)
    if m:
        info["from_language"], info["mission"] = _strip_flag(m.group(1)), m.group(2)
    if "PROACTIVE LANGUAGE MENTOR" in text:
        info["mode"] = "teacher"
    info["input_tx"] = "input_audio_transcription" in setup_config
    info["output_tx"] = "output_audio_transcription" in setup_config
    return info


def synth_speech(text: str, seed: int, base_f0: float = 165.0) -> bytes:
    """Speech-like PCM16 (voiced syllables with moving formants and word gaps)."""
    rnd = random.Random(seed)
    words = max(1, len(text.split()) if " " in text else len(text) // 2)
    out = array.array("h")
    t_global = 0
    for w in range(words):
        for _ in range(rnd.choice([1, 1, 2, 2, 3])):
            dur = rnd.uniform(0.11, 0.21)
            n = int(dur * OUT_RATE)
            f0 = base_f0 * rnd.uniform(0.85, 1.2)
            f1, f2 = rnd.uniform(350, 850), rnd.uniform(900, 2300)
            amps = []
            for h in range(1, 13):
                fh = f0 * h
                a = math.exp(-((fh - f1) / 220) ** 2) + 0.6 * math.exp(-((fh - f2) / 350) ** 2) + 0.08 / h
                amps.append((2 * math.pi * fh / OUT_RATE, a))
            norm = sum(a for _, a in amps) or 1.0
            for i in range(n):
                env = math.sin(math.pi * i / n) ** 2
                t = t_global + i
                s = 0.0
                for k, a in amps:
                    s += a * math.sin(k * t)
                out.append(int(9000 * env * s / norm))
            t_global += n
        gap = int(rnd.uniform(0.05, 0.12) * OUT_RATE)
        if rnd.random() < 0.15:
            gap += int(0.25 * OUT_RATE)  # breath / comma
        out.extend([0] * gap)
        t_global += gap
    out.extend([0] * int(0.25 * OUT_RATE))
    return out.tobytes()


def chunk_text(text: str, n_chunks: int):
    if " " in text:
        words = text.split(" ")
        per = max(1, math.ceil(len(words) / n_chunks))
        parts = [" ".join(words[i:i + per]) for i in range(0, len(words), per)]
        # like the live API, continuation chunks carry their leading space
        return [p if i == 0 else " " + p for i, p in enumerate(parts)]
    per = max(1, math.ceil(len(text) / n_chunks))
    return [text[i:i + per] for i in range(0, len(text), per)]


class GeminiLive:
    def __init__(self, project_id: str, location: str, model: str, input_sample_rate: int = 16000):
        self.project_id = project_id
        self.location = location
        self.model = model
        self.input_sample_rate = input_sample_rate
        self.tool_mapping = {}
        print(f"🧪 GeminiLive STUB initialized (model={model}, project={project_id}) - no network calls")

    def register_tool(self, func: Callable):
        self.tool_mapping[func.__name__] = func
        return func

    async def start_session(self, audio_input_queue: asyncio.Queue, video_input_queue: asyncio.Queue,
                            text_input_queue: asyncio.Queue, audio_output_callback: Callable,
                            audio_interrupt_callback: Optional[Callable] = None,
                            setup_config: Optional[Dict] = None):
        info = parse_setup(setup_config)
        print("🧪 stub session:", json.dumps(info, ensure_ascii=False))
        dialogue = get_dialogue(info["mission"], info["language"], info["mode"], info["from_language"])
        events: asyncio.Queue = asyncio.Queue()
        seed = random.randrange(1 << 30)

        async def drain(q):
            try:
                while True:
                    await q.get()
            except asyncio.CancelledError:
                pass

        async def send_audio(pcm: bytes):
            if inspect.iscoroutinefunction(audio_output_callback):
                await audio_output_callback(pcm)
            else:
                audio_output_callback(pcm)

        async def script():
            try:
                await asyncio.sleep(2.2)  # learner opens the conversation ("You start the conversation!")
                for idx, (who, text) in enumerate(dialogue["turns"]):
                    if who == "user":
                        chunks = chunk_text(text, max(1, len(text) // 18))
                        for c in chunks:
                            await asyncio.sleep(0.45)
                            if info["input_tx"]:
                                await events.put({"serverContent": {"inputTranscription": {"text": c, "finished": True}}})
                        await asyncio.sleep(1.4)  # end-of-speech silence before the persona answers
                    else:
                        pcm = await asyncio.to_thread(synth_speech, text, seed + idx)
                        frame = int(0.2 * OUT_RATE) * 2
                        frames = [pcm[i:i + frame] for i in range(0, len(pcm), frame)]
                        chunks = chunk_text(text, max(1, len(frames) // 2))
                        ci = 0
                        for fi, f in enumerate(frames):
                            await send_audio(f)
                            # transcription trails the audio slightly, like the real API
                            if info["output_tx"] and ci < len(chunks) and fi >= (ci * len(frames)) // len(chunks):
                                await events.put({"serverContent": {"outputTranscription": {"text": chunks[ci], "finished": True}}})
                                ci += 1
                            await asyncio.sleep(0.19)
                        while info["output_tx"] and ci < len(chunks):
                            await events.put({"serverContent": {"outputTranscription": {"text": chunks[ci], "finished": True}}})
                            ci += 1
                        await events.put({"serverContent": {"turnComplete": True}})
                        await asyncio.sleep(0.8)
                await events.put({"toolCall": {"functionCalls": [{
                    "name": "complete_mission",
                    "args": {"score": dialogue["score"], "feedback_pointers": dialogue["feedback"]},
                    "id": f"function-call-{uuid.uuid4().int % 10**19}",
                }]}})
                await asyncio.sleep(8)  # client closes the socket after its 2.5 s outro
            except asyncio.CancelledError:
                pass
            except Exception as e:  # pragma: no cover
                logger.exception("stub script failed")
                await events.put({"type": "error", "error": str(e)})
            finally:
                await events.put(None)

        tasks = [asyncio.create_task(drain(q)) for q in (audio_input_queue, video_input_queue, text_input_queue)]
        tasks.append(asyncio.create_task(script()))
        try:
            while True:
                ev = await events.get()
                if ev is None:
                    break
                yield ev
        finally:
            for t in tasks:
                t.cancel()
