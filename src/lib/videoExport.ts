/**
 * Canvas-based video export: renders Ken Burns animation on a canvas,
 * mixes voiceover + music via Web Audio API, and records to WebM.
 */

export interface VideoExportOptions {
  imageUrl: string;
  voiceoverUrl: string;
  musicUrl: string;
  voiceVolume: number;
  musicVolume: number;
  duration: number; // seconds
  width?: number;
  height?: number;
  onProgress?: (progress: number) => void;
}

// Same keyframes used in the preview animation
const kenBurnsKeyframes = {
  scale: [1, 1.12, 1.18, 1.1, 1.2, 1.05],
  x: [0, 0.03, -0.02, 0.01, -0.03, 0],
  y: [0, -0.02, 0.01, -0.03, 0.02, 0],
  times: [0, 0.2, 0.4, 0.6, 0.8, 1],
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateKeyframes(
  progress: number,
  values: number[],
  times: number[]
): number {
  for (let i = 0; i < times.length - 1; i++) {
    if (progress >= times[i] && progress <= times[i + 1]) {
      const t = (progress - times[i]) / (times[i + 1] - times[i]);
      return lerp(values[i], values[i + 1], t);
    }
  }
  return values[values.length - 1];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

async function loadAudioBuffer(
  audioCtx: AudioContext,
  url: string
): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

export async function exportVideo(
  options: VideoExportOptions
): Promise<Blob> {
  const {
    imageUrl,
    voiceoverUrl,
    musicUrl,
    voiceVolume,
    musicVolume,
    duration,
    width = 1080,
    height = 1920,
    onProgress,
  } = options;

  // Load image + audio in parallel
  const audioCtx = new AudioContext();
  const [img, voiceBuffer, musicBuffer] = await Promise.all([
    loadImage(imageUrl),
    loadAudioBuffer(audioCtx, voiceoverUrl),
    loadAudioBuffer(audioCtx, musicUrl),
  ]);

  // Canvas setup
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Audio routing → recording destination
  const dest = audioCtx.createMediaStreamDestination();

  const voiceSource = audioCtx.createBufferSource();
  voiceSource.buffer = voiceBuffer;
  const voiceGain = audioCtx.createGain();
  voiceGain.gain.value = voiceVolume;
  voiceSource.connect(voiceGain);
  voiceGain.connect(dest);

  const musicSource = audioCtx.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop = true;
  const musicGain = audioCtx.createGain();
  musicGain.gain.value = musicVolume;
  musicSource.connect(musicGain);
  musicGain.connect(dest);

  // Combine canvas video stream + audio stream
  const videoStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  // Choose best available codec
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      audioCtx.close();
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      audioCtx.close();
      reject(new Error("Video recording failed"));
    };

    recorder.start(100);
    voiceSource.start(0);
    musicSource.start(0);

    const startTime = performance.now();
    const totalMs = duration * 1000;

    function drawFrame() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / totalMs, 1);
      onProgress?.(progress);

      const scale = interpolateKeyframes(
        progress,
        kenBurnsKeyframes.scale,
        kenBurnsKeyframes.times
      );
      const xOffset = interpolateKeyframes(
        progress,
        kenBurnsKeyframes.x,
        kenBurnsKeyframes.times
      );
      const yOffset = interpolateKeyframes(
        progress,
        kenBurnsKeyframes.y,
        kenBurnsKeyframes.times
      );

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(
        width / 2 + xOffset * width,
        height / 2 + yOffset * height
      );
      ctx.scale(scale, scale);

      // Cover-fit the image
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let drawW: number, drawH: number;
      if (imgAspect > canvasAspect) {
        drawH = height;
        drawW = height * imgAspect;
      } else {
        drawW = width;
        drawH = width / imgAspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        voiceSource.stop();
        musicSource.stop();
        recorder.stop();
      }
    }

    requestAnimationFrame(drawFrame);
  });
}
