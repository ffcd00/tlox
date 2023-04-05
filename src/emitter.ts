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

  /**
   * The function adds a value to the constant pool.
   * @param value The value to be added to the constant pool.
   * @returns The index of that constant in the constant pool.
   */
  public makeConstant(value: Value): number {
    const constant = this.chunk.addConstant(value);

    return constant;
  }

  /**
   * Emit DEFINE_GLOBAL Opcode
   * @param The index of the variable’s name in the constant pool
   */
  public defineVariable(global: number): void {
    this.emitBytes(OpCode.OP_DEFINE_GLOBAL, global);
  }
}
