import type { OpCode } from "./common";
import type { Value, ValueArray } from "./value";

export class Chunk {
  public readonly code: OpCode[] = [];
  public readonly constants: ValueArray = [];
  public readonly lines: number[] = [];

  public writeChunk(opcode: OpCode) {
    this.code.push(opcode);
  }

  public addConstant(value: Value) {
    this.constants.push(value);
    return this.constants.length - 1;
  }
}

