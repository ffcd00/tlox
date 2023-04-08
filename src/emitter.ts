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
   * emits a bytecode instruction and writes a placeholder operand
   * for the jump offset.
   * @param instruction `OpCode`
   * @returns the offset of the emitted instruction in the chunk
   */
  public emitJump(instruction: OpCode): number {
    this.emitByte(instruction);
    this.emitByte(<OpCode>0xff);
    this.emitByte(<OpCode>0xff);
    return this.chunk.code.length - 2;
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
   * replaces the operand at the given location with the calculated
   * jump offset
   * @param offset
   */
  public patchJump(offset: number): void {
    // -2 to adjust for the bytecode for the jump offset itself.
    const jump = this.chunk.code.length - offset - 2;

    // TODO: sanity check if offset if greater than 0xffff

    this.chunk.code[offset] = (jump >> 8) & 0xff;
    this.chunk.code[offset + 1] = jump & 0xff;
  }
}
