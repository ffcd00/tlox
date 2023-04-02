import { Writable } from 'stream';

export class Environment {
  constructor(
    private readonly outStream: Writable = process.stdout,
    private readonly errorStream: Writable = process.stderr
  ) {}

  public stdout(payload: any): void {
    this.outStream.write(payload);
  }

  public stderr(payload: any): void {
    this.errorStream.write(payload);
  }

  public close(): void {
    this.outStream.end();
    this.errorStream.end();
  }
}
