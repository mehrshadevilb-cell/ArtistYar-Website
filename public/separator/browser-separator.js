let session = null;
let loading = null;

const MODEL =
  "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main/htdemucs_fp16weights.onnx";
const SR = 44100;
// ~7.8s chunks — fixed model input length for this ONNX export
const CHUNK = 343980;
const OVERLAP = 0.25;
const STEP = Math.floor(CHUNK * (1 - OVERLAP));

// All iOS browsers (Chrome, Firefox, Edge, etc.) are required by Apple to use
// the WebKit engine underneath — there is no real "Chrome" engine on iOS.
// WebKit on iOS enforces a much tighter per-tab memory ceiling than desktop
// or Android Chrome, and multi-threaded WASM (SharedArrayBuffer-based) is a
// known source of instability/crashes there. When a tab is OOM-killed on
// iOS it typically shows as a blank/white page that silently reloads — which
// is exactly this symptom, and it cannot be caught with try/catch.
const IS_IOS =
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Hard duration caps to avoid the browser tab being OOM-killed (which shows
// as a blank/white page with no catchable JS error). Full-stem mode keeps up
// to 4 full-length Float32Array buffers alive at once, so it gets a tighter
// cap than standard (vocals-only) mode. iOS gets a much tighter cap on top
// of that because of WebKit's stricter memory limit.
const MAX_DURATION_SECONDS_STANDARD = IS_IOS ? 3 * 60 : 8 * 60;
const MAX_DURATION_SECONDS_FULL = IS_IOS ? 2 * 60 : 5 * 60;

function humanError(err) {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (/Aborted|out of memory|OOM|memory|grow_memory|RuntimeError/i.test(msg)) {
    return "حافظه مرورگر برای پردازش این فایل کافی نبود (خطای WASM). تب‌های دیگر را ببندید و دوباره امتحان کنید؛ در صورت تکرار، فایل کوتاه‌تر یا کم‌حجم‌تر انتخاب کنید.";
  }
  if (/WebGPU|gpu/i.test(msg)) {
    return "پردازنده گرافیکی مرورگر با موتور تفکیک سازگار نبود. دوباره تلاش کنید تا روی پردازنده مرکزی اجرا شود.";
  }
  return msg || "تفکیک صدا با خطا مواجه شد.";
}

async function loadOrt() {
  if (window.ort) return window.ort;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("بارگذاری ONNX Runtime ناموفق بود."));
    document.head.appendChild(s);
  });
  return window.ort;
}

async function loadModelBytes(progress) {
  const cacheName = "artistyar-separator-model-v1";
  const cache = "caches" in window ? await window.caches.open(cacheName) : null;
  let response = cache ? await cache.match(MODEL) : null;
  if (!response) {
    response = await fetch(MODEL, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error("دانلود مدل Demucs ناموفق بود: " + response.status);
    if (cache) await cache.put(MODEL, response.clone());
  }
  const total = Number(response.headers.get("content-length") || 0);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 1024 * 1024) throw new Error("مدل Demucs ناقص یا خالی دریافت شد.");
  progress?.({ phase: "model", loaded: buffer.byteLength, total: total || buffer.byteLength, cached: Boolean(cache && await cache.match(MODEL)) });
  return new Uint8Array(buffer);
}

async function getSession(progress) {
  if (session) return session;
  if (loading) return loading;

  loading = (async () => {
    const ort = await loadOrt();
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
    // Multi-threaded WASM (SharedArrayBuffer) is unstable/crash-prone on iOS
    // WebKit, so force single-threaded there regardless of core count. On
    // other platforms, fewer threads = lower peak memory and fewer Aborted
    // crashes on weak devices.
    ort.env.wasm.numThreads = IS_IOS
      ? 1
      : Math.max(1, Math.min(2, navigator.hardwareConcurrency || 2));
    ort.env.wasm.simd = true;

    progress?.({ phase: "model", loaded: 0, total: 1 });
    const bytes = await loadModelBytes(progress);

    // Prefer WASM first for stability; WebGPU can abort on some GPUs/drivers,
    // and WebGPU support on iOS Safari/WebKit is still too unreliable to try.
    const tryProviders = [["wasm"]];
    if (navigator.gpu && !IS_IOS) tryProviders.unshift(["webgpu", "wasm"]);

    let lastErr;
    for (const eps of tryProviders) {
      try {
        const s = await ort.InferenceSession.create(bytes, {
          executionProviders: eps,
          graphOptimizationLevel: "basic",
        });
        return s;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("ساخت نشست مدل ناموفق بود.");
  })();

  try {
    session = await loading;
    return session;
  } finally {
    loading = null;
  }
}

function stereoPlanar(audio, n, start) {
  const x = new Float32Array(2 * n);
  const len = Math.min(n, audio.left.length - start);
  if (len > 0) {
    x.set(audio.left.subarray(start, start + len), 0);
    x.set(audio.right.subarray(start, start + len), n);
  }
  return x;
}

function wav(planar, sr) {
  sr = sr || SR;
  const N = planar.length / 2;
  const b = new ArrayBuffer(44 + N * 4);
  const d = new DataView(b);
  let p = 0;
  const s = (x) => {
    for (let i = 0; i < x.length; i++) d.setUint8(p++, x.charCodeAt(i));
  };
  const u16 = (x) => {
    d.setUint16(p, x, true);
    p += 2;
  };
  const u32 = (x) => {
    d.setUint32(p, x, true);
    p += 4;
  };
  s("RIFF");
  u32(36 + N * 4);
  s("WAVE");
  s("fmt ");
  u32(16);
  u16(1);
  u16(2);
  u32(sr);
  u32(sr * 4);
  u16(4);
  u16(16);
  s("data");
  u32(N * 4);
  for (let i = 0; i < N; i++) {
    d.setInt16(p, Math.max(-1, Math.min(1, planar[i])) * 32767, true);
    p += 2;
    d.setInt16(p, Math.max(-1, Math.min(1, planar[N + i])) * 32767, true);
    p += 2;
  }
  return new Blob([b], { type: "audio/wav" });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes, seed = 0xffffffff) {
  let c = seed;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}

async function crc32Blob(blob) {
  let c = 0xffffffff;
  const chunkSize = 1024 * 1024;
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    c = crc32(new Uint8Array(await blob.slice(offset, Math.min(offset + chunkSize, blob.size)).arrayBuffer()), c);
    if (offset && offset % (chunkSize * 8) === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return (c ^ 0xffffffff) >>> 0;
}

async function zipStored(files) {
  const encoder = new TextEncoder();
  const local = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const size = file.blob.size;
    const crc = await crc32Blob(file.blob);
    const header = new ArrayBuffer(30);
    const h = new DataView(header);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true);
    h.setUint16(26, name.length, true);
    // Keep audio as Blob parts instead of copying every WAV into a second full buffer.
    local.push(new Uint8Array(header), name, file.blob);

    const directory = new ArrayBuffer(46);
    const d = new DataView(directory);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true);
    d.setUint32(16, crc, true); d.setUint32(20, size, true); d.setUint32(24, size, true);
    d.setUint16(28, name.length, true); d.setUint32(42, offset, true);
    central.push(new Uint8Array(directory), name);
    offset += 30 + name.length + size;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new ArrayBuffer(22);
  const e = new DataView(end);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...central, new Uint8Array(end)], { type: "application/zip" });
}

async function decode(file) {
  const ac = new OfflineAudioContext(2, 44100, 44100);
  const raw = await file.arrayBuffer();
  let x = await ac.decodeAudioData(raw.slice(0));
  if (x.sampleRate !== 44100) {
    const r = new OfflineAudioContext(
      2,
      Math.ceil(x.duration * 44100),
      44100,
    );
    const src = r.createBufferSource();
    src.buffer = x;
    src.connect(r.destination);
    src.start();
    x = await r.startRendering();
  }
  const left = x.getChannelData(0).slice();
  const right =
    x.numberOfChannels > 1
      ? x.getChannelData(1).slice()
      : x.getChannelData(0).slice();
  return { left, right };
}

window.artistYarBrowserSeparate = async function (
  file,
  onProgress,
  mode,
) {
  mode = mode || "standard";
  try {
    const audio = await decode(file);
    let N = audio.left.length;

    // Guard against the tab being silently OOM-killed (shows as a blank/white
    // page with no catchable error) on long files: compressed file size is a
    // poor proxy for decoded PCM size, so check the actual duration instead.
    const needFull = mode === "full";
    const durationSeconds = N / SR;
    const maxDuration = needFull ? MAX_DURATION_SECONDS_FULL : MAX_DURATION_SECONDS_STANDARD;
    if (durationSeconds > maxDuration) {
      const maxMinutes = Math.round(maxDuration / 60);
      throw new Error(
        "مدت این فایل صوتی برای پردازش در مرورگر خیلی زیاد است (حداکثر " +
          maxMinutes +
          " دقیقه در این حالت" +
          (IS_IOS ? " روی iOS" : "") +
          "). لطفاً فایل کوتاه‌تری انتخاب کنید یا آن را برش بزنید.",
      );
    }

    const s = await getSession(onProgress);
    const ort = window.ort;
    const total = Math.max(1, Math.ceil(Math.max(1, N - CHUNK) / STEP) + 1);

    // Memory: standard mode only needs vocals accumulation (stem index 3).
    // Full mode needs all 4 stems.
    const vocals = new Float32Array(2 * N);
    const drums = needFull ? new Float32Array(2 * N) : null;
    const bass = needFull ? new Float32Array(2 * N) : null;
    const other = needFull ? new Float32Array(2 * N) : null;
    const norm = new Float32Array(N);

    for (let seg = 0; seg < total; seg++) {
      const start = seg * STEP;
      const chunk = stereoPlanar(audio, CHUNK, start);
      const input = new ort.Tensor("float32", chunk, [1, 2, CHUNK]);

      let t;
      try {
        t = await s.run({ mix: input });
      } catch (runErr) {
        input.dispose?.();
        throw runErr;
      }
      input.dispose?.();

      const out = t.sources.data;
      const shape = t.sources.dims;
      const samples = shape[3];
      const sources = shape[1];
      const fade = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        let w = 1;
        if (seg > 0 && i < CHUNK * OVERLAP) w = i / (CHUNK * OVERLAP);
        if (seg < total - 1 && i > CHUNK - CHUNK * OVERLAP)
          w = Math.min(w, (CHUNK - i) / (CHUNK * OVERLAP));
        fade[i] = w;
        const idx = Math.min(N - 1, start + i);
        norm[idx] += w;
      }

      // htdemucs order: 0=drums, 1=bass, 2=other, 3=vocals
      const writeStem = (stemIdx, target) => {
        if (!target) return;
        const base = stemIdx * 2 * samples;
        for (let i = 0; i < samples && start + i < N; i++) {
          const w = fade[i];
          target[start + i] += out[base + i] * w;
          target[N + start + i] += out[base + samples + i] * w;
        }
      };

      writeStem(3, vocals);
      if (needFull) {
        writeStem(0, drums);
        writeStem(1, bass);
        writeStem(2, other);
      }

      for (const k of Object.keys(t)) t[k]?.dispose?.();
      onProgress?.({ segment: seg + 1, totalSegments: total });

      // Yield so UI stays responsive and GC can run between segments
      if (seg % 2 === 1) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    for (let i = 0; i < N; i++) {
      const w = norm[i] || 1;
      vocals[i] /= w;
      vocals[N + i] /= w;
      if (needFull) {
        drums[i] /= w;
        drums[N + i] /= w;
        bass[i] /= w;
        bass[N + i] /= w;
        other[i] /= w;
        other[N + i] /= w;
      }
    }

    const files = [];
    if (needFull) {
      files.push({ name: "vocals.wav", blob: wav(vocals) });
      files.push({ name: "drums.wav", blob: wav(drums) });
      files.push({ name: "bass.wav", blob: wav(bass) });
      files.push({ name: "other.wav", blob: wav(other) });
    } else {
      const instrumental = new Float32Array(2 * N);
      for (let i = 0; i < N; i++) {
        instrumental[i] = audio.left[i] - vocals[i];
        instrumental[N + i] = audio.right[i] - vocals[N + i];
      }
      files.push({ name: "vocals.wav", blob: wav(vocals) });
      files.push({ name: "instrumental.wav", blob: wav(instrumental) });
    }

    return await zipStored(files);
  } catch (err) {
    throw new Error(humanError(err));
  }
};
