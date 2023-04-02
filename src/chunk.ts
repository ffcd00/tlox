import type { OpCode } from './enum';
import type { Value, ValueArray } from './value';

export class Chunk {
  public readonly code: OpCode[] = [];

  public readonly constants: ValueArray = [];

  public readonly lines: number[] = [];

  public writeChunk(opcode: OpCode, line: number): void {
    this.code.push(opcode);
    this.lines.push(line);
  }

  public addConstant(value: Value): number {
    this.constants.push(value);
    return this.constants.length - 1;
  }
}
