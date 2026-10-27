import { Attempt } from './capture-attempt';

/** Liberação síncrona + barreira da permissão getUserMedia não cancelável. */
export class WebPhotoResources {
  readonly attempt = new Attempt();
  private cleanups: (() => void)[] = [];
  private opening: Promise<unknown> | null = null;
  private disposed = false;
  private failed = false;
  constructor(private readonly releaseLease: () => void) {
    this.attempt.signal.addEventListener('abort', () => this.disposeNow(), { once: true });
  }
  own = (cleanup: () => void) => {
    if (this.disposed) this.clean(cleanup); else this.cleanups.push(cleanup);
  };
  private clean(cleanup: () => void) { try { cleanup(); } catch { this.failed = true; } }
  stopStream(stream: MediaStream) {
    for (const track of stream.getTracks()) this.clean(() => track.stop());
  }
  trackOpening(work: Promise<MediaStream>) {
    this.opening = work;
    // Nenhuma resposta tardia restaura a tentativa ou fica com uma câmera aberta.
    void work.then(stream => { if (this.disposed) this.stopStream(stream); }, () => undefined);
  }
  private disposeNow() {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups.splice(0).reverse()) this.clean(cleanup);
  }
  async close(): Promise<boolean> {
    this.attempt.cancel();
    this.disposeNow();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const drained = this.opening?.then(() => true, () => true) ?? Promise.resolve(true);
    try {
      const complete = await Promise.race([drained, new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 10000); })]);
      if (complete && !this.failed) { this.releaseLease(); return true; }
      // Enquanto a permissão não retorna, manter exclusão global. Ao retornar,
      // stopStream acima executa antes desta liberação; não publica resultado.
      void drained.then(() => { if (!this.failed) this.releaseLease(); });
      return false;
    } finally { clearTimeout(timer); }
  }
}
