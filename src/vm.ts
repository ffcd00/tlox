import type { Chunk } from './chunk';
import { DEBUG_TRACE_EXECUTION, OpCode } from './common';
import { DebugUtil } from './debug';
import { Value } from './value';

const STACK_MAX = 256;

export enum InterpretResult {
  OK,
  COMPILE_ERROR,
  RUNTIME_ERROR,
}

type BinaryOperator = '+' | '-' | '*' | '/';

export class VM {
  private instructionIndex: number = 0;

  private stackTop: number = 0;

  private readonly stack: Value[] = new Array<Value>(STACK_MAX);

  constructor(private readonly chunk: Chunk, private readonly debugUtil: DebugUtil) {}

  public initVM(): void {
    this.resetStack();
  }

  public interpret(): InterpretResult {
    // this.run();
    // compile(source);
    return InterpretResult.OK;
  }

  private run(): InterpretResult {
    for (;;) {
      if (DEBUG_TRACE_EXECUTION) {
        this.debugUtil.disassembleInstruction(this.instructionIndex);
      }

      switch (this.readByte()) {
        case OpCode.OP_CONSTANT: {
          const constant: Value = this.readConstant();
          this.push(constant);
          break;
        }
        case OpCode.OP_ADD:
          this.binaryOperator('+');
          break;
        case OpCode.OP_SUBTRACT:
          this.binaryOperator('-');
          break;
        case OpCode.OP_MULTIPLY:
          this.binaryOperator('*');
          break;
        case OpCode.OP_DIVIDE:
          this.binaryOperator('/');
          break;
        case OpCode.OP_NEGATE:
          this.push(-this.pop());
          break;
        case OpCode.OP_RETURN:
          this.pop();
          return InterpretResult.OK;
      }
    }
  }

  private readByte(): OpCode {
    const index = this.instructionIndex;
    this.instructionIndex += 1;
    return this.chunk.code[index];
  }

  private readConstant(): Value {
    return this.chunk.constants[this.readByte()];
  }

  private push(value: Value): void {
    this.stack[this.stackTop] = value;
    this.stackTop += 1;
  }

  private pop(): Value {
    this.stackTop -= 1;
    return this.stack[this.stackTop];
  }

  private resetStack(): void {
    this.stackTop = 0;
  }

  private binaryOperator(op: BinaryOperator): void {
    const b = this.pop();
    const a = this.pop();

    const result = ((): number => {
      switch (op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        default:
          return 0;
      }
    })();

    this.push(result);
  }
}
