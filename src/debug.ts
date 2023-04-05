import { Chunk } from './chunk';
import { OpCode } from './enum';
import { printValue } from './value';

const OP_NAME_PADDING = 16;

export class DebugUtil {
  constructor(private readonly chunk: Chunk) {}

  public disassembleInstruction(offset: number): number {
    const message = String(offset).padStart(4, '0');

    const instruction = this.chunk.code[offset];
    switch (instruction) {
      case OpCode.OP_RETURN:
        return this.simpleInstruction('OP_RETURN', offset, message);
      case OpCode.OP_CONSTANT:
        return this.constantInstruction('OP_CONSTANT', offset, message);
      case OpCode.OP_NIL:
        return this.simpleInstruction('OP_NIL', offset, message);
      case OpCode.OP_TRUE:
        return this.simpleInstruction('OP_TRUE', offset, message);
      case OpCode.OP_FALSE:
        return this.simpleInstruction('OP_FALSE', offset, message);
      case OpCode.OP_EQUAL:
        return this.simpleInstruction('OP_EQUAL', offset, message);
      case OpCode.OP_GET_GLOBAL:
        return this.constantInstruction('OP_GET_GLOBAL', offset, message);
      case OpCode.OP_DEFINE_GLOBAL:
        return this.constantInstruction('OP_DEFINE_GLOBAL', offset, message);
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
      default:
        console.log(`Unknown opcode ${instruction}`);
        return offset + 1;
    }
  }

  public disassembleChunk(name: string): void {
    console.log(`== ${name} ==`);

    for (let offset = 0; offset < this.chunk.code.length; ) {
      offset = this.disassembleInstruction(offset);
    }
  }

  private simpleInstruction(name: keyof typeof OpCode, offset: number, message: string): number {
    console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')}`);
    return offset + 1;
  }

  private constantInstruction(name: keyof typeof OpCode, offset: number, message: string): number {
    const constantIndex = this.chunk.code[offset + 1];
    if (constantIndex !== undefined) {
      const constant = this.chunk.constants[constantIndex];
      console.log(`${message} ${name.padEnd(OP_NAME_PADDING, ' ')} ${constantIndex} ${printValue(constant)}`);
      return offset + 2;
    }
    console.error(`Error: constant not found at index ${offset + 1}`);
    return offset + 1;
  }
}
