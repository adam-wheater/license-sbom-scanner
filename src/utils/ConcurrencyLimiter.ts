export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly maxConcurrency: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  async map<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
    return Promise.all(items.map((item) => this.run(() => fn(item))));
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.active--;
    }
  }
}
