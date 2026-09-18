# ArtistYar UVR Worker

GPU inference service for ArtistYar stem separation.

It uses audio-separator, an MIT-licensed Python wrapper whose separation implementations are largely based on Ultimate Vocal Remover (UVR) code and UVR-trained models. UVR itself is MIT-licensed; individual model/weight licenses must still be respected.

Render deployment:
- Docker root: services/uvr-worker
- Port: 8000
- Health check: /health
- One worker process per GPU
- Persistent disk mounted at /models

Set UVR_WORKER_URL on the ArtistYar web service to the worker URL.

The default 2-stem flow uses the vocal_balanced UVR-family ensemble. Quality is not claimed to be bit-for-bit identical to every desktop UVR configuration: model, ensemble, GPU and inference parameters affect output.

Keep UVR/model attribution and do not redistribute model weights unless their applicable licenses permit it.
