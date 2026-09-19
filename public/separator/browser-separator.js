let session = null;
let loading = null;
const MODEL = "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main/htdemucs_fp16weights.onnx";
const SR = 44100;
const CHUNK = 343980;
const OVERLAP = 0.25;
const STEP = Math.floor(CHUNK * (1 - OVERLAP));

// Every iOS browser uses WebKit. Keep its peak memory deliberately low:
// decoded PCM and model tensors are much larger than the uploaded file.
const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IOS_MAX_BYTES = 18 * 1024 * 1024;
const MAX_DURATION_STANDARD = IS_IOS ? 120 : 480;
const MAX_DURATION_FULL = IS_IOS ? 90 : 300;

function humanError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/abort|out of memory|oom|memory|grow_memory|runtimeerror/i.test(message)) {
    return "حافظه مرورگر برای پردازش این فایل کافی نبود. در iOS فایل کوتاه‌تری انتخاب کنید و تب‌های دیگر را ببندید.";
  }
  if (/webgpu|gpu/i.test(message)) return "پردازنده گرافیکی مرورگر سازگار نبود؛ پردازش با CPU انجام نشد.";
  return message || "تفکیک صدا با خطا مواجه شد.";
}

async function loadOrt() {
  if (window.ort) return window.ort;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("بارگذاری ONNX Runtime ناموفق بود."));
    document.head.appendChild(script);
  });
  return window.ort;
}

async function loadModel(progress) {
  const url = MODEL;
  const cache = "caches" in window ? await caches.open("artistyar-separator-model-v1") : null;
  let response = cache && await cache.match(url);
  if (!response) {
    response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error("دانلود مدل Demucs ناموفق بود: " + response.status);
    if (cache) await cache.put(url, response.clone());
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 1024 * 1024) throw new Error("مدل Demucs ناقص یا خالی دریافت شد.");
  progress?.({ phase: "model", loaded: buffer.byteLength, total: Number(response.headers.get("content-length")) || buffer.byteLength });
  return new Uint8Array(buffer);
}

async function getSession(progress) {
  if (session) return session;
  if (loading) return loading;
  loading = (async () => {
    const ort = await loadOrt();
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
    // Never use SharedArrayBuffer/multi-threaded WASM on WebKit.
    ort.env.wasm.numThreads = IS_IOS ? 1 : Math.max(1, Math.min(2, navigator.hardwareConcurrency || 2));
    ort.env.wasm.simd = true;
    const bytes = await loadModel(progress);
    try {
      return await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "basic" });
    } finally {
      bytes.fill(0);
    }
  })();
  try { session = await loading; return session; } finally { loading = null; }
}

function stereoPlanar(audio, n, start) {
  const out = new Float32Array(2 * n);
  const length = Math.min(n, audio.left.length - start);
  if (length > 0) {
    out.set(audio.left.subarray(start, start + length), 0);
    out.set(audio.right.subarray(start, start + length), n);
  }
  return out;
}

function wav(planar) {
  const n = planar.length / 2;
  const buffer = new ArrayBuffer(44 + n * 4);
  const view = new DataView(buffer);
  let p = 0;
  const text = value => { for (const c of value) view.setUint8(p++, c.charCodeAt(0)); };
  const u16 = value => { view.setUint16(p, value, true); p += 2; };
  const u32 = value => { view.setUint32(p, value, true); p += 4; };
  text("RIFF"); u32(36 + n * 4); text("WAVEfmt "); u32(16); u16(1); u16(2); u32(SR); u32(SR * 4); u16(4); u16(16); text("data"); u32(n * 4);
  for (let i = 0; i < n; i++) { view.setInt16(p, Math.max(-1, Math.min(1, planar[i])) * 32767, true); p += 2; view.setInt16(p, Math.max(-1, Math.min(1, planar[n + i])) * 32767, true); p += 2; }
  return new Blob([buffer], { type: "audio/wav" });
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; }
function crc32(bytes, seed = 0xffffffff) { let c = seed; for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8); return c >>> 0; }
async function crc32Blob(blob) { let c = 0xffffffff; for (let offset = 0; offset < blob.size; offset += 1048576) c = crc32(new Uint8Array(await blob.slice(offset, Math.min(offset + 1048576, blob.size)).arrayBuffer()), c); return (c ^ 0xffffffff) >>> 0; }

async function zipStored(files) {
  const encoder = new TextEncoder(), local = [], central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), size = file.blob.size, crc = await crc32Blob(file.blob);
    const header = new ArrayBuffer(30), h = new DataView(header);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    local.push(new Uint8Array(header), name, file.blob);
    const directory = new ArrayBuffer(46), d = new DataView(directory);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint32(16, crc, true); d.setUint32(20, size, true); d.setUint32(24, size, true); d.setUint16(28, name.length, true); d.setUint32(42, offset, true);
    central.push(new Uint8Array(directory), name); offset += 30 + name.length + size;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0), end = new ArrayBuffer(22), e = new DataView(end);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...central, new Uint8Array(end)], { type: "application/zip" });
}

async function decode(file) {
  const raw = await file.arrayBuffer();
  const source = new OfflineAudioContext(2, SR, SR);
  let decoded = await source.decodeAudioData(raw);
  if (decoded.sampleRate !== SR) {
    const target = new OfflineAudioContext(2, Math.ceil(decoded.duration * SR), SR);
    const node = target.createBufferSource(); node.buffer = decoded; node.connect(target.destination); node.start(); decoded = await target.startRendering();
  }
  const left = decoded.getChannelData(0).slice();
  const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1).slice() : left.slice();
  return { left, right };
}

window.artistYarBrowserSeparate = async function (file, onProgress, mode = "standard") {
  try {
    if (IS_IOS && file.size > IOS_MAX_BYTES) throw new Error("حجم فایل روی iOS باید کمتر از ۱۸ مگابایت باشد. لطفاً فایل را کوتاه‌تر یا فشرده‌تر کنید.");
    if (mode === "full" && IS_IOS) throw new Error("حالت تفکیک کامل چهاراستمی روی iOS برای جلوگیری از سفیدشدن صفحه غیرفعال است؛ حالت استاندارد را انتخاب کنید.");
    const audio = await decode(file);
    const N = audio.left.length, duration = N / SR, limit = mode === "full" ? MAX_DURATION_FULL : MAX_DURATION_STANDARD;
    if (duration > limit) throw new Error("مدت فایل برای پردازش مرورگری زیاد است؛ حداکثر " + Math.round(limit / 60) + " دقیقه" + (IS_IOS ? " روی iOS" : "") + ".");
    const s = await getSession(onProgress), ort = window.ort, total = Math.max(1, Math.ceil(Math.max(1, N - CHUNK) / STEP) + 1), full = mode === "full";
    const vocals = new Float32Array(2 * N), drums = full ? new Float32Array(2 * N) : null, bass = full ? new Float32Array(2 * N) : null, other = full ? new Float32Array(2 * N) : null, norm = new Float32Array(N);
    for (let segment = 0; segment < total; segment++) {
      const start = segment * STEP, input = new ort.Tensor("float32", stereoPlanar(audio, CHUNK, start), [1, 2, CHUNK]);
      let result; try { result = await s.run({ mix: input }); } finally { input.dispose?.(); }
      const out = result.sources.data, shape = result.sources.dims, samples = shape[3], fade = new Float32Array(samples);
      for (let i = 0; i < samples; i++) { let weight = 1; if (segment && i < CHUNK * OVERLAP) weight = i / (CHUNK * OVERLAP); if (segment < total - 1 && i > CHUNK * (1 - OVERLAP)) weight = Math.min(weight, (CHUNK - i) / (CHUNK * OVERLAP)); fade[i] = weight; if (start + i < N) norm[start + i] += weight; }
      const write = (stem, target) => { if (!target) return; const base = stem * 2 * samples; for (let i = 0; i < samples && start + i < N; i++) { const w = fade[i]; target[start + i] += out[base + i] * w; target[N + start + i] += out[base + samples + i] * w; } };
      write(3, vocals); if (full) { write(0, drums); write(1, bass); write(2, other); }
      Object.values(result).forEach(value => value?.dispose?.());
      onProgress?.({ segment: segment + 1, totalSegments: total });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    for (let i = 0; i < N; i++) { const w = norm[i] || 1; vocals[i] /= w; vocals[N + i] /= w; if (full) { drums[i] /= w; drums[N + i] /= w; bass[i] /= w; bass[N + i] /= w; other[i] /= w; other[N + i] /= w; } }
    const files = [];
    if (full) files.push({ name: "vocals.wav", blob: wav(vocals) }, { name: "drums.wav", blob: wav(drums) }, { name: "bass.wav", blob: wav(bass) }, { name: "other.wav", blob: wav(other) });
    else { const instrumental = new Float32Array(2 * N); for (let i = 0; i < N; i++) { instrumental[i] = audio.left[i] - vocals[i]; instrumental[N + i] = audio.right[i] - vocals[N + i]; } files.push({ name: "vocals.wav", blob: wav(vocals) }, { name: "instrumental.wav", blob: wav(instrumental) }); }
    return await zipStored(files);
  } catch (error) { throw new Error(humanError(error)); }
};
