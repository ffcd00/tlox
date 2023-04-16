import { Chunk } from './chunk';
import { OpCode } from './enum';
import { printValue } from './value';

const OP_NAME_PADDING = 16;

export class DebugUtil {
  constructor() {}

  public disassembleInstruction(chunk: Chunk, offset: number): number {
    const message = String(offset).padStart(4, '0');

    const instruction = chunk.code[offset];
    switch (instruction) {
      case OpCode.OP_RETURN:
        return this.simpleInstruction('OP_RETURN', offset, message);
      case OpCode.OP_CONSTANT:
        return this.constantInstruction('OP_CONSTANT', offset, message, chunk);
      case OpCode.OP_NIL:
        return this.simpleInstruction('OP_NIL', offset, message);
      case OpCode.OP_TRUE:
        return this.simpleInstruction('OP_TRUE', offset, message);
      case OpCode.OP_FALSE:
        return this.simpleInstruction('OP_FALSE', offset, message);
      case OpCode.OP_POP:
        return this.simpleInstruction('OP_POP', offset, message);
      case OpCode.OP_EQUAL:
        return this.simpleInstruction('OP_EQUAL', offset, message);
      case OpCode.OP_GET_LOCAL:
        return this.byteInstruction('OP_GET_LOCAL', offset, message, chunk);
      case OpCode.OP_SET_LOCAL:
        return this.byteInstruction('OP_SET_LOCAL', offset, message, chunk);
      case OpCode.OP_GET_GLOBAL:
        return this.constantInstruction('OP_GET_GLOBAL', offset, message, chunk);
      case OpCode.OP_DEFINE_GLOBAL:
        return this.constantInstruction('OP_DEFINE_GLOBAL', offset, message, chunk);
      case OpCode.OP_SET_GLOBAL:
        return this.constantInstruction('OP_SET_GLOBAL', offset, message, chunk);
      case OpCode.OP_GREATER:
        return this.simpleInstruction('OP_GREATER', offset, message);
      case OpCode.OP_LESS:
        return this.simpleInstruction('OP_LESS', offset, message);
      case OpCode.OP_ADD:
        return this.simpleInstruction('OP_ADD', offset, message);
      case OpCode.OP_SUBTRACT:
        return this.simpleInstruction('OP_SUBTRACT', offset, message);
      case OpCode.OP_MULTIPLY:
        return this.simpleInstruction('OP_MULTIPLY', offset, message);
      case OpCode.OP_DIVIDE:
        return this.simpleInstruction('OP_DIVIDE', offset, message);
      case OpCode.OP_NOT:
        return this.simpleInstruction('OP_NOT', offset, message);
      case OpCode.OP_NEGATE:
        return this.simpleInstruction('OP_NEGATE', offset, message);
      case OpCode.OP_PRINT:
        return this.simpleInstruction('OP_PRINT', offset, message);
      case OpCode.OP_JUMP:
        return this.jumpInstruction('OP_JUMP', offset, message, 1, chunk);
      case OpCode.OP_JUMP_IF_FALSE:
        return this.jumpInstruction('OP_JUMP_IF_FALSE', offset, message, 1, chunk);
      case OpCode.OP_LOOP:
        return this.jumpInstruction('OP_LOOP', offset, message, -1, chunk);
      case OpCode.OP_CALL:
        return this.byteInstruction('OP_CALL', offset, message, chunk);
      default:
        console.log(`Unknown opcode ${instruction}`);
        return offset + 1;
    }
  }

  public disassembleChunk(chunk: Chunk, name: string): void {
    console.log(`== ${name} ==`);

    for (let offset = 0; offset < chunk.code.length; offset) {
      offset = this.disassembleInstruction(chunk, offset);
    }
  }

  private simpleInstruction(name: keyof typeof OpCode, offset: number, message: string): number {
    console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')}`);
    return offset + 1;
  }

  private byteInstruction(name: keyof typeof OpCode, offset: number, message: string, chunk: Chunk): number {
    const slot = chunk.code[offset + 1];
    console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')} ${slot}`);
    return offset + 2;
  }

  private jumpInstruction(
    name: keyof typeof OpCode,
    offset: number,
    message: string,
    sign: number,
    chunk: Chunk
  ): number {
    let jump = chunk.code[offset + 1] << 8;
    jump |= chunk.code[offset + 2];
    console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')} ${offset} -> ${offset + 3 + sign * jump}`);
    return offset + 3;
  }

  private constantInstruction(name: keyof typeof OpCode, offset: number, message: string, chunk: Chunk): number {
    const constantIndex = chunk.code[offset + 1];
    if (constantIndex !== undefined) {
      const constant = chunk.constants[constantIndex];
      console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')} ${constantIndex} ${printValue(constant)}`);
      return offset + 2;
    }
    console.error(`Error: constant not found at index ${offset + 1}`);
    return offset + 1;
  }
}
