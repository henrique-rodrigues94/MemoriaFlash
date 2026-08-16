/**
 * Android WebView can reject HTMLVideoElement.play() when srcObject is
 * replaced/stopped while the media element is loading. ScannerView awaits
 * play(), so that rejection used to surface as a fatal camera error.
 *
 * Keep the fix narrowly scoped to video elements that have a MediaStream and
 * retry only the browser's known interrupted-load error. This lets the
 * existing scanner continue using getUserMedia without changing its UI.
 */
let installed = false;

export function installCameraPlaybackFix(): void {
  if (installed || typeof HTMLVideoElement === 'undefined') return;
  installed = true;

  const prototype = HTMLVideoElement.prototype as HTMLVideoElement & { __memoriaFlashPlayPatched?: boolean };
  if (prototype.__memoriaFlashPlayPatched) return;

  const originalPlay = HTMLVideoElement.prototype.play;
  const patchedPlay = function(this: HTMLVideoElement): Promise<void> {
    const attempt = (remaining: number): Promise<void> => {
      return originalPlay.call(this).catch((error: any) => {
        const message = String(error?.message || '').toLowerCase();
        const interrupted = error?.name === 'AbortError' && message.includes('interrupted') || message.includes('new load request');
        if (!interrupted || remaining <= 0 || !this.srcObject) throw error;
        return new Promise<void>((resolve, reject) => {
          window.setTimeout(() => {
            attempt(remaining - 1).then(resolve).catch(reject);
          }, 120);
        });
      });
    };

    return attempt(5);
  };

  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: patchedPlay,
  });
  prototype.__memoriaFlashPlayPatched = true;
}
