let session = null;
let loading = null;

const MODEL =
  "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main/htdemucs_fp16weights.onnx";
const SR = 44100;
// ~7.8s chunks — fixed model input length for this ONNX export
const CHUNK = 343980;
const OVERLAP = 0.25;
const STEP = Math.floor(CHUNK * (1 - OVERLAP));

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

async function getSession(progress) {
  if (session) return session;
  if (loading) return loading;

  loading = (async () => {
    const ort = await loadOrt();
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
    // Fewer threads = lower peak memory and fewer Aborted crashes on weak devices
    ort.env.wasm.numThreads = Math.max(
      1,
      Math.min(2, navigator.hardwareConcurrency || 2),
    );
    ort.env.wasm.simd = true;

    progress?.({ phase: "model", loaded: 0, total: 1 });
    const res = await fetch(MODEL);
    if (!res.ok) throw new Error("دانلود مدل Demucs ناموفق بود: " + res.status);

    const total = Number(res.headers.get("content-length") || 0);
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    progress?.({
      phase: "model",
      loaded: bytes.byteLength,
      total: total || bytes.byteLength,
    });

    // Prefer WASM first for stability; WebGPU can abort on some GPUs/drivers
    const tryProviders = [["wasm"]];
    if (navigator.gpu) tryProviders.unshift(["webgpu", "wasm"]);

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

    const s = await getSession(onProgress);
    const ort = window.ort;
    const total = Math.max(1, Math.ceil(Math.max(1, N - CHUNK) / STEP) + 1);

    // Memory: standard mode only needs vocals accumulation (stem index 3).
    // Full mode needs all 4 stems.
    const needFull = mode === "full";
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

    const zipCtor = window.JSZip;
    if (!zipCtor) throw new Error("موتور ZIP در دسترس نیست.");
    const z = new zipCtor();

    if (needFull) {
      z.file("vocals.wav", wav(vocals));
      z.file("drums.wav", wav(drums));
      z.file("bass.wav", wav(bass));
      z.file("other.wav", wav(other));
    } else {
      const instrumental = new Float32Array(2 * N);
      for (let i = 0; i < N; i++) {
        instrumental[i] = audio.left[i] - vocals[i];
        instrumental[N + i] = audio.right[i] - vocals[N + i];
      }
      z.file("vocals.wav", wav(vocals));
      z.file("instrumental.wav", wav(instrumental));
    }

    return await z.generateAsync({ type: "blob" });
  } catch (err) {
    throw new Error(humanError(err));
  }
};
