import { Chunk } from './chunk';
import { OpCode } from './enum';
import { Parser } from './parser';
import { Value } from './value';

export class Emitter {
  constructor(private readonly chunk: Chunk, private readonly parser: Parser) {}

  public emitByte(byte: OpCode): void {
    this.chunk.writeChunk(byte, this.parser.previous.line);
  }

  public emitBytes(byte1: OpCode, byte2: OpCode): void {
    this.emitByte(byte1);
    this.emitByte(byte2);
  }

  public emitReturn(): void {
    this.emitByte(OpCode.OP_RETURN);
  }

  /**
   *
   * @param value
   * @returns The index of value in the constant pool
   */
  public emitConstant(value: Value): number {
    const index = this.makeConstant(value);
    this.emitBytes(OpCode.OP_CONSTANT, index);
    return index;
  }

  private makeConstant(value: Value): number {
    const constant = this.chunk.addConstant(value);

    return constant;
  }
}
