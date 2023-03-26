import { Chunk } from './chunk';
import { DEBUG_TRACE_EXECUTION, OpCode } from './common';
import { DebugUtil } from './debug';
import { allocateString, asString, isString } from './object';
import {
  asNumber,
  booleanValue,
  isFalsy,
  isNumber,
  nilValue,
  numberValue,
  objectValue,
  Value,
  valuesEqual,
} from './value';

const STACK_MAX = 256;

export enum InterpretResult {
  OK,
  COMPILE_ERROR,
  RUNTIME_ERROR,
}

type BinaryOperator = '+' | '-' | '*' | '/' | '>' | '<';

export class VM {
  private instructionIndex: number = 0;

  private stackTop: number = 0;

  private readonly stack: Value[] = new Array<Value>(STACK_MAX);

  constructor(private readonly chunk: Chunk, private readonly debugUtil: DebugUtil) {}

  public initVM(): void {
    this.resetStack();
  }

  public run(): InterpretResult {
    for (;;) {
      if (DEBUG_TRACE_EXECUTION) {
        this.debugUtil.disassembleInstruction(this.instructionIndex);
      }

      try {
        switch (this.readByte()) {
          case OpCode.OP_CONSTANT: {
            const constant: Value = this.readConstant();
            this.push(constant);
            break;
          }
          case OpCode.OP_NIL:
            this.push(nilValue());
            break;
          case OpCode.OP_TRUE:
            this.push(booleanValue(true));
            break;
          case OpCode.OP_FALSE:
            this.push(booleanValue(false));
            break;
          case OpCode.OP_EQUAL: {
            const b = this.pop();
            const a = this.pop();
            this.push(booleanValue(valuesEqual(a, b)));
            break;
          }
          case OpCode.OP_GREATER:
            this.binaryOperator(booleanValue, '>');
            break;
          case OpCode.OP_LESS:
            this.binaryOperator(booleanValue, '<');
            break;
          case OpCode.OP_ADD: {
            if (isString(this.peek()) && isString(this.peek(1))) {
              this.concatenate();
            } else if (isNumber(this.peek()) && isNumber(this.peek(1))) {
              this.binaryOperator(numberValue, '+');
            } else {
              this.runtimeError('Operands must be two numbers or two strings');
              return InterpretResult.RUNTIME_ERROR;
            }
            break;
          }
          case OpCode.OP_SUBTRACT:
            this.binaryOperator(numberValue, '-');
            break;
          case OpCode.OP_MULTIPLY:
            this.binaryOperator(numberValue, '*');
            break;
          case OpCode.OP_DIVIDE:
            this.binaryOperator(numberValue, '/');
            break;
          case OpCode.OP_NOT:
            this.push(booleanValue(isFalsy(this.pop())));
            break;
          case OpCode.OP_NEGATE: {
            if (!isNumber(this.peek())) {
              this.runtimeError('Operand must be a number');
              return InterpretResult.RUNTIME_ERROR;
            }
            this.push(numberValue(-asNumber(this.pop())));
            break;
          }
          case OpCode.OP_RETURN: {
            const r = this.pop();

            if (DEBUG_TRACE_EXECUTION) {
              console.log(r);
            }

            return InterpretResult.OK;
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          if (e.message === 'OPERANDS_ARE_NOT_NUMBER') {
            return InterpretResult.RUNTIME_ERROR;
          }
        }
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

  private peek(distance: number = 0): Value {
    return this.stack[this.stackTop - 1 - distance];
  }

  private resetStack(): void {
    this.stackTop = 0;
  }

  private runtimeError(message: string): void {
    console.log(message);
    this.resetStack();
  }

  /**
   *
   * @param valueType
   * @param op
   * @throws OPERANDS_NOT_NUMBERS
   */
  private binaryOperator(valueType: typeof numberValue | typeof booleanValue, op: BinaryOperator): void {
    if (!isNumber(this.peek()) || !isNumber(this.peek(1))) {
      this.runtimeError('Operands must be numbers');
      throw new Error('OPERANDS_ARE_NOT_NUMBER');
    }

    const b = asNumber(this.pop());
    const a = asNumber(this.pop());

    const result = ((): number | boolean => {
      switch (op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '>':
          return a > b;
        case '<':
          return a < b;
      }
    })();

    this.push((valueType as (value: number | boolean) => Value)(result));
  }

  private concatenate(): void {
    const b = asString(this.pop());
    const a = asString(this.pop());
    const result = allocateString(a.chars.concat(b.chars));
    this.push(objectValue(result));
  }
}
