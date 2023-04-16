import { Chunk } from './chunk';
import { DEBUG_TRACE_EXECUTION, UINT8_COUNT } from './common';
import { DebugUtil } from './debug';
import { InterpretResult, OpCode } from './enum';
import { Environment } from './environment';
import { CallFrame } from './frame';
import {
  allocateString,
  asFunction,
  asString,
  isString,
  ObjectFunction,
  ObjectString,
  ObjectType,
  objectType,
} from './object';
import {
  asNumber,
  booleanValue,
  isFalsy,
  isNumber,
  isObject,
  nilValue,
  numberValue,
  objectValue,
  printValue,
  Value,
  valuesEqual,
} from './value';

const FRAMES_MAX = 64;
const STACK_MAX = FRAMES_MAX * UINT8_COUNT;

type BinaryOperator = '+' | '-' | '*' | '/' | '>' | '<';

export class VirtualMachine {
  private stackTop: number = 0;

  private readonly stack: Value[] = new Array<Value>(STACK_MAX);

  /**
   * Global variables in the VM
   */
  private readonly globals: Map<string, Value> = new Map<string, Value>();

  /**
   * `strings` is a mapping between computed string constants and
   * the corresponding `ObjectString` for string interning in runtime.
   */
  private readonly strings: Map<string, ObjectString> = new Map<string, ObjectString>();

  /**
   * CallFrame in the VM
   */
  private frames: CallFrame[] = new Array<CallFrame>(FRAMES_MAX);

  /**
   * The current height of the CallFrame stack
   */
  private frameCount: number = 0;

  constructor(
    private readonly chunk: Chunk,
    private readonly debugUtil: DebugUtil,
    private readonly environment: Environment
  ) {}

  public initVM(): void {
    this.resetStack();
    this.strings.clear();
  }

  public run(func: ObjectFunction): InterpretResult {
    const frame = new CallFrame(func, 0, 0);
    this.frames[this.frameCount++] = frame;

    for (;;) {
      let frame = this.currentFrame();

      if (DEBUG_TRACE_EXECUTION && func.chunk.code[frame.instructionIndex] !== undefined) {
        this.debugUtil.disassembleInstruction(func.chunk, frame.instructionIndex);
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
          case OpCode.OP_POP:
            this.pop();
            break;
          case OpCode.OP_GET_LOCAL: {
            const slot = this.readByte();
            this.push(this.stack[frame.slotIndex + slot]);
            break;
          }
          case OpCode.OP_SET_LOCAL: {
            const slot = this.readByte();
            this.stack[frame.slotIndex + slot] = this.peek();
            break;
          }
          case OpCode.OP_GET_GLOBAL: {
            const name = this.readString().chars;

            let value: Value | undefined;
            if ((value = this.globals.get(name))) {
              this.push(value);
            } else {
              this.runtimeError(`Undefined variable '${name}'`);
              return InterpretResult.RUNTIME_ERROR;
            }
            break;
          }
          case OpCode.OP_DEFINE_GLOBAL: {
            const name = this.readString();
            this.globals.set(name.chars, this.peek());
            this.pop();
            break;
          }
          case OpCode.OP_SET_GLOBAL: {
            const name = this.readString().chars;

            if (!this.globals.has(name)) {
              this.globals.delete(name);
              this.runtimeError(`Undefined variable ${name}`);
              return InterpretResult.RUNTIME_ERROR;
            }

            this.globals.set(name, this.peek());
            break;
          }
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
            const number = asNumber(this.pop());
            const negate = number === 0 ? -0 : -number;
            this.push(numberValue(negate));
            break;
          }
          case OpCode.OP_PRINT: {
            const value = printValue(this.pop());
            this.environment.stdout(value);
            this.environment.stdout('\n');
            break;
          }
          case OpCode.OP_JUMP_IF_FALSE: {
            const offset = this.readShort();
            if (isFalsy(this.peek())) {
              frame.instructionIndex += offset;
            }
            break;
          }
          case OpCode.OP_JUMP: {
            const offset = this.readShort();
            frame.instructionIndex += offset;
            break;
          }
          case OpCode.OP_LOOP: {
            const offset = this.readShort();
            frame.instructionIndex -= offset;
            break;
          }
          case OpCode.OP_CALL: {
            const argCount = this.readByte();
            if (!this.callValue(this.peek(argCount), argCount)) {
              return InterpretResult.RUNTIME_ERROR;
            }
            frame = this.frames[this.frameCount - 1];
            break;
          }
          case OpCode.OP_RETURN: {
            const result = this.pop();
            this.frameCount -= 1;
            if (this.frameCount === 0) {
              this.pop();
              return InterpretResult.OK;
            }

            this.stackTop = frame.slotIndex - 1;
            this.push(result);
            frame = this.frames[this.frameCount - 1];
            break;
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

  private currentFrame(): CallFrame {
    return this.frames[this.frameCount - 1];
  }

  private readByte(): OpCode {
    const frame = this.currentFrame();
    const index = frame.instructionIndex;
    frame.instructionIndex += 1;
    return frame.func.chunk.code[index];
  }

  private readConstant(): Value {
    const frame = this.currentFrame();
    return frame.func.chunk.constants[this.readByte()];
  }

  /**
   * reads the next two bytes from the chunk and builds a 16-bit
   * integer out of them
   * @returns
   */
  private readShort(): number {
    const frame = this.currentFrame();
    const a = frame.func.chunk.code[frame.instructionIndex];
    const b = frame.func.chunk.code[frame.instructionIndex + 1];
    frame.instructionIndex += 2;
    return (a << 8) | b;
  }

  private readString(): ObjectString {
    return asString(this.readConstant());
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

  private call(func: ObjectFunction, argCount: number): boolean {
    if (argCount !== func.arity) {
      this.runtimeError(`Expect ${func.arity} arguments but got ${argCount}`);
      return false;
    }
    if (this.frameCount >= FRAMES_MAX) {
      this.runtimeError('Stack overflow');
      return false;
    }

    const frame = new CallFrame(func, 0, this.stackTop - argCount);
    this.frames[this.frameCount] = frame;
    this.frameCount += 1;
    return true;
  }

  private callValue(callee: Value, argCount: number): boolean {
    if (isObject(callee)) {
      switch (objectType(callee)) {
        case ObjectType.FUNCTION:
          return this.call(asFunction(callee), argCount);
        default:
          // Non-callable object type
          break;
      }
    }
    this.runtimeError('Can only call functions and classes');
    return false;
  }

  private resetStack(): void {
    this.stackTop = 0;
    this.frameCount = 0;
  }

  private runtimeError(message: string): void {
    this.environment.stderr(`runtime error: ${message}`);
    this.environment.stderr('\n');

    for (let i = this.frameCount - 1; i >= 0; i--) {
      const frame = this.frames[i];
      const { func } = frame;
      const instruction = frame.func.chunk.code[frame.instructionIndex - 1];
      this.environment.stderr(`[line ${func.chunk.lines[instruction]}] in `);
      if (func.name.chars === '') {
        this.environment.stderr('script\n');
      } else {
        this.environment.stderr(`${func.name.chars}()\n`);
      }
    }

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

    const string = a.chars.concat(b.chars);
    if (this.strings.has(string)) {
      this.push(objectValue(this.strings.get(string)!));
    } else {
      const result = allocateString(string);
      this.push(objectValue(result));
      this.strings.set(string, result);
    }
  }
}
