import { FilesetResolver, GestureRecognizer } from './vision_bundle.mjs';
let recognizer;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const canvas = new OffscreenCanvas(16, 16);
      if (!canvas.getContext('webgl2') && !new OffscreenCanvas(16, 16).getContext('webgl')) throw new Error('WebGL 未就绪，请在 Desktop 中开启硬件加速');
      const files = await FilesetResolver.forVisionTasks(new URL('./wasm', self.location.href).href, true);
      recognizer = await GestureRecognizer.createFromOptions(files, { baseOptions: { modelAssetPath: new URL('./gesture_recognizer.task', self.location.href).href, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.6 });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      try {
        const result = recognizer.recognizeForVideo(data.bitmap, data.timestamp);
        self.postMessage({ type: 'result', timestamp: data.timestamp, landmarks: result.landmarks[0] || [], category: result.gestures[0]?.[0]?.categoryName || 'None', score: result.gestures[0]?.[0]?.score || 0 });
      } finally { data.bitmap.close(); }
    } else if (data.type === 'close') { recognizer?.close(); self.close(); }
  } catch (error) { self.postMessage({ type: 'error', error: error.message || String(error) }); }
};
