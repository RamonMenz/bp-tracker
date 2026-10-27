import { PhotoCaptureError } from './photo-capture-contract';

let attemptSequence = 0;

// Sem UID, storage, logger ou callbacks de escrita. Também protege recursos obtidos tarde.
export class Attempt {
  readonly id = ++attemptSequence;
  readonly controller = new AbortController();
  private cleanups: (() => void)[] = [];
  readonly startedAt = Date.now();
  get signal(): AbortSignal { return this.controller.signal; }
  check(): void { if (this.signal.aborted) throw new PhotoCaptureError('cancelled'); }
  own(cleanup: () => void): void {
    if (this.signal.aborted) cleanup(); else this.cleanups.push(cleanup);
  }
  cancel(): void {
    this.controller.abort();
    const cleanups = this.cleanups.splice(0).reverse();
    for (const cleanup of cleanups) { try { cleanup(); } catch { /* cada recurso é independente; sem erro bruto */ } }
  }
  async wait<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer); this.signal.removeEventListener('abort', abort); callback();
      };
      const abort = () => finish(() => reject(new PhotoCaptureError('cancelled')));
      this.signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => { finish(() => reject(new PhotoCaptureError('timeout'))); this.cancel(); }, timeoutMs);
      work.then(value => finish(() => {
        if (this.signal.aborted) reject(new PhotoCaptureError('cancelled')); else resolve(value);
      }), error => finish(() => reject(error instanceof PhotoCaptureError ? error : new PhotoCaptureError('engine-failed'))));
      if (this.signal.aborted) abort();
    });
  }
}
