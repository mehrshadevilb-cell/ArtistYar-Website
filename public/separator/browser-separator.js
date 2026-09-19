let session=null;let loading=null;
const MODEL='https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main/htdemucs_fp16weights.onnx';
const SR=44100,CHUNK=343980,OVERLAP=0.25,STEP=Math.floor(CHUNK*(1-OVERLAP));
async function loadOrt(){
  if(window.ort)return window.ort;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('ONNX Runtime Web could not be loaded.'));document.head.appendChild(s)});
  return window.ort;
}
async function getSession(progress){
  if(session)return session;
  if(loading)return loading;
  loading=(async()=>{
    const ort=await loadOrt();
    ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
    ort.env.wasm.numThreads=Math.max(1,Math.min(8,navigator.hardwareConcurrency||4));
    progress?.({phase:'model',loaded:0,total:1});
    const res=await fetch(MODEL); if(!res.ok)throw new Error('Demucs browser model download failed: '+res.status);
    // Avoid retaining every streamed chunk plus a second combined model buffer.
    // The old implementation could temporarily hold ~2x the model size and trigger
    // browser memory pressure before ONNX Runtime even initialized.
    const total=Number(res.headers.get('content-length')||0);
    const buffer=await res.arrayBuffer();
    const bytes=new Uint8Array(buffer);
    progress?.({phase:'model',loaded:bytes.byteLength,total:total||bytes.byteLength});
    const eps=navigator.gpu?['webgpu','wasm']:['wasm'];
    return await ort.InferenceSession.create(bytes,{executionProviders:eps,graphOptimizationLevel:'all'});
  })();
  try{return await loading}finally{loading=null}
}
function stereoPlanar(audio,N,start){const x=new Float32Array(2*N);const len=Math.min(N,audio.left.length-start);if(len>0){x.set(audio.left.subarray(start,start+len),0);x.set(audio.right.subarray(start,start+len),N)}return x}
function wav(planar,sr=SR){const N=planar.length/2,b=new ArrayBuffer(44+N*4),d=new DataView(b);let p=0;const s=x=>{for(let i=0;i<x.length;i++)d.setUint8(p++,x.charCodeAt(i))},u16=x=>{d.setUint16(p,x,true);p+=2},u32=x=>{d.setUint32(p,x,true);p+=4};s('RIFF');u32(36+N*4);s('WAVE');s('fmt ');u32(16);u16(1);u16(2);u32(sr);u32(sr*4);u16(4);u16(16);s('data');u32(N*4);for(let i=0;i<N;i++){d.setInt16(p,Math.max(-1,Math.min(1,planar[i]))*32767,true);p+=2;d.setInt16(p,Math.max(-1,Math.min(1,planar[N+i]))*32767,true);p+=2}return new Blob([b],{type:'audio/wav'})}
async function decode(file){const ac=new OfflineAudioContext(2,44100,44100);const raw=await file.arrayBuffer();let x=await ac.decodeAudioData(raw.slice(0));if(x.sampleRate!==44100){const r=new OfflineAudioContext(2,Math.ceil(x.duration*44100),44100),src=r.createBufferSource();src.buffer=x;src.connect(r.destination);src.start();x=await r.startRendering()}return{left:x.getChannelData(0).slice(),right:x.numberOfChannels>1?x.getChannelData(1).slice():x.getChannelData(0).slice()}}
window.artistYarBrowserSeparate=async(file,onProgress,mode='standard')=>{
  const audio=await decode(file),N=audio.left.length,stems=Array.from({length:4},()=>new Float32Array(2*N)),norm=new Float32Array(N),s=await getSession(onProgress);
  const ort=window.ort,total=Math.max(1,Math.ceil(Math.max(1,N-CHUNK)/STEP)+1);
  for(let seg=0;seg<total;seg++){
    const start=seg*STEP,chunk=stereoPlanar(audio,CHUNK,start);
    const input=new ort.Tensor('float32',chunk,[1,2,CHUNK]);
    const t=await s.run({mix:input}); input.dispose();
    const out=t.sources.data;
    const shape=t.sources.dims; const samples=shape[3],sources=shape[1];
    const fade=new Float32Array(samples); for(let i=0;i<samples;i++){let w=1;if(seg>0&&i<CHUNK*OVERLAP)w=i/(CHUNK*OVERLAP);if(seg<total-1&&i>CHUNK-CHUNK*OVERLAP)w=Math.min(w,(CHUNK-i)/(CHUNK*OVERLAP));fade[i]=w;norm[Math.min(N-1,start+i)]+=w}
    for(let stem=0;stem<Math.min(4,sources);stem++){const base=stem*2*samples;for(let i=0;i<samples&&start+i<N;i++){const w=fade[i];stems[stem][start+i]+=out[base+i]*w;stems[stem][N+start+i]+=out[base+samples+i]*w}}
    for(const k of Object.keys(t))t[k]?.dispose?.();
    onProgress?.({segment:seg+1,totalSegments:total});
  }
  for(let i=0;i<N;i++){const w=norm[i]||1;for(const a of stems){a[i]/=w;a[N+i]/=w}}
  const vocals=stems[3],instrumental=new Float32Array(2*N);
  for(let i=0;i<N;i++){instrumental[i]=audio.left[i]-vocals[i];instrumental[N+i]=audio.right[i]-vocals[N+i]}
  const zip=window.JSZip;if(!zip)throw new Error('ZIP runtime is unavailable.');
  const z=new zip();
  if(mode==='full'){
    z.file('vocals.wav',wav(stems[3]));
    z.file('drums.wav',wav(stems[0]));
    z.file('bass.wav',wav(stems[1]));
    z.file('other.wav',wav(stems[2]));
  }else{
    z.file('vocals.wav',wav(vocals));
    z.file('instrumental.wav',wav(instrumental));
  }
  return await z.generateAsync({type:'blob'});
};