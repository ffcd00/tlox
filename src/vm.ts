import { DEBUG_TRACE_EXECUTION, UINT8_COUNT } from './common';
import { DebugUtil } from './debug';
import { InterpretResult, ObjectType, OpCode } from './enum';
import { Environment } from './environment';
import { CallFrame } from './frame';
import { LoxClosure, LoxFunction, LoxString, LoxUpvalue, LoxObject, LoxClass, LoxInstance } from './object';
import { Value } from './value';

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
  private readonly strings: Map<string, LoxString> = new Map<string, LoxString>();

  /**
   * CallFrame in the VM
   */
  private frames: CallFrame[] = new Array<CallFrame>(FRAMES_MAX);

  /**
   * The current height of the CallFrame stack
   */
  private frameCount: number = 0;

  /**
   * The list of open upvalues
   */
  private openUpvalues: LoxUpvalue | undefined;

  constructor(private readonly debugUtil: DebugUtil, private readonly environment: Environment) {}

  public initVM(): void {
    this.resetStack();
    this.strings.clear();
  }

  public run(func: LoxFunction): InterpretResult {
    const closure = new LoxClosure(func);
    const frame = new CallFrame(closure, 0, 0);
    this.frames[this.frameCount++] = frame;

    for (;;) {
      let frame = this.currentFrame();

      if (DEBUG_TRACE_EXECUTION) {
        this.debugUtil.disassembleInstruction(frame.closure.func.chunk, frame.instructionIndex);
      }

      try {
        switch (this.readByte()) {
          case OpCode.OP_CONSTANT: {
            const constant: Value = this.readConstant();
            this.push(constant);
            break;
          }
          case OpCode.OP_NIL:
            this.push(Value.nilValue());
            break;
          case OpCode.OP_TRUE:
            this.push(Value.booleanValue(true));
            break;
          case OpCode.OP_FALSE:
            this.push(Value.booleanValue(false));
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
          case OpCode.OP_GET_UPVALUE: {
            const slot = this.readByte();
            this.push(frame.closure.upvalues[slot].location);
            break;
          }
          case OpCode.OP_SET_UPVALUE: {
            const slot = this.readByte();
            frame.closure.upvalues[slot].location = this.peek();
            break;
          }
          case OpCode.OP_GET_PROPERTY: {
            if (!LoxInstance.isInstance(this.peek())) {
              this.runtimeError('Only instances have properties');
              return InterpretResult.RUNTIME_ERROR;
            }

            const instance = LoxInstance.asInstance(this.peek());
            const name: string = this.readString().chars;

            let value: Value | undefined;
            if ((value = instance.fields.get(name))) {
              this.pop();
              this.push(value);
              break;
            }

            this.runtimeError(`Undefined property ${name}`);
            return InterpretResult.RUNTIME_ERROR;
          }
          case OpCode.OP_SET_PROPERTY: {
            if (!LoxInstance.isInstance(this.peek(1))) {
              this.runtimeError('Only instances have fields');
              return InterpretResult.RUNTIME_ERROR;
            }

            const instance = LoxInstance.asInstance(this.peek(1));
            const name = this.readString().chars;
            instance.fields.set(name, this.peek());
            const value = this.pop();
            this.pop();
            this.push(value);
            break;
          }
          case OpCode.OP_EQUAL: {
            const b = this.pop();
            const a = this.pop();
            this.push(Value.booleanValue(a.equals(b)));
            break;
          }
          case OpCode.OP_GREATER:
            this.binaryOperator(Value.booleanValue, '>');
            break;
          case OpCode.OP_LESS:
            this.binaryOperator(Value.booleanValue, '<');
            break;
          case OpCode.OP_ADD: {
            if (LoxString.isString(this.peek()) && LoxString.isString(this.peek(1))) {
              this.concatenate();
            } else if (this.peek().isNumber() && this.peek(1).isNumber()) {
              this.binaryOperator(Value.numberValue, '+');
            } else {
              this.runtimeError('Operands must be two numbers or two strings');
              return InterpretResult.RUNTIME_ERROR;
            }
            break;
          }
          case OpCode.OP_SUBTRACT:
            this.binaryOperator(Value.numberValue, '-');
            break;
          case OpCode.OP_MULTIPLY:
            this.binaryOperator(Value.numberValue, '*');
            break;
          case OpCode.OP_DIVIDE:
            this.binaryOperator(Value.numberValue, '/');
            break;
          case OpCode.OP_NOT:
            this.push(Value.booleanValue(this.pop().isFalsy()));
            break;
          case OpCode.OP_NEGATE: {
            if (!this.peek().isNumber()) {
              this.runtimeError('Operand must be a number');
              return InterpretResult.RUNTIME_ERROR;
            }
            const number = this.pop().asNumber();
            const negate = number === 0 ? -0 : -number;
            this.push(Value.numberValue(negate));
            break;
          }
          case OpCode.OP_PRINT: {
            const value = this.pop().toString();
            this.environment.stdout(value);
            this.environment.stdout('\n');
            break;
          }
          case OpCode.OP_JUMP_IF_FALSE: {
            const offset = this.readShort();
            if (this.peek().isFalsy()) {
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
          case OpCode.OP_CLOSURE: {
            const func = LoxFunction.asFunction(this.readConstant());
            const closure = new LoxClosure(func);
            this.push(Value.objectValue(closure));

            for (let i = 0; i < closure.upvalueCount; i++) {
              const isLocal = this.readByte();
              const index = this.readByte();
              if (isLocal) {
                closure.upvalues[i] = this.captureUpvalue(frame.slotIndex + index);
              } else {
                closure.upvalues[i] = frame.closure.upvalues[index];
              }
            }
            break;
          }
          case OpCode.OP_CLOSE_UPVALUE: {
            this.closeUpvalues(this.stackTop - 1);
            this.pop();
            break;
          }
          case OpCode.OP_RETURN: {
            const result = this.pop();
            this.closeUpvalues(frame.slotIndex);
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
          case OpCode.OP_CLASS: {
            const name = this.readString();
            const klass = new LoxClass(name);
            this.push(Value.objectValue(klass));
            break;
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          if (e.message === 'OPERANDS_ARE_NOT_NUMBER') {
            return InterpretResult.RUNTIME_ERROR;
          }
        }
        throw e;
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
    return frame.closure.func.chunk.code[index];
  }

  private readConstant(): Value {
    const frame = this.currentFrame();
    return frame.closure.func.chunk.constants[this.readByte()];
  }

  /**
   * reads the next two bytes from the chunk and builds a 16-bit
   * integer out of them
   * @returns
   */
  private readShort(): number {
    const frame = this.currentFrame();
    const a = frame.closure.func.chunk.code[frame.instructionIndex];
    const b = frame.closure.func.chunk.code[frame.instructionIndex + 1];
    frame.instructionIndex += 2;
    return (a << 8) | b;
  }

  private readString(): LoxString {
    return LoxString.asString(this.readConstant());
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

  private call(closure: LoxClosure, argCount: number): boolean {
    if (argCount !== closure.func.arity) {
      this.runtimeError(`Expect ${closure.func.arity} arguments but got ${argCount}`);
      return false;
    }
    if (this.frameCount >= FRAMES_MAX) {
      this.runtimeError('Stack overflow');
      return false;
    }

    const frame = new CallFrame(closure, 0, this.stackTop - argCount);
    this.frames[this.frameCount] = frame;
    this.frameCount += 1;
    return true;
  }

  private callValue(callee: Value, argCount: number): boolean {
    if (callee.isObject()) {
      switch (LoxObject.objectType(callee)) {
        case ObjectType.CLASS: {
          const klass = LoxClass.asClass(callee);
          const instance = new LoxInstance(klass);
          this.stack[this.stackTop - argCount - 1] = Value.objectValue(instance);
          return true;
        }
        case ObjectType.CLOSURE:
          return this.call(LoxClosure.asClosure(callee), argCount);
        default:
          // Non-callable object type
          break;
      }
    }
    this.runtimeError('Can only call functions and classes');
    return false;
  }

  /**
   * Capture a value at the given index in the stack
   * @param stackIndex
   * @returns
   */
  private captureUpvalue(stackIndex: number): LoxUpvalue {
    const local = this.stack[stackIndex];
    let prevUpvalue: LoxUpvalue | undefined;
    let upvalue = this.openUpvalues;

    while (upvalue !== undefined && upvalue.upvalueIndex > stackIndex) {
      prevUpvalue = upvalue;
      upvalue = upvalue.next;
    }

    if (upvalue !== undefined && upvalue.location === local) {
      return upvalue;
    }

    const createdUpvalue = new LoxUpvalue(local);
    createdUpvalue.next = upvalue;

    if (prevUpvalue === undefined) {
      createdUpvalue.upvalueIndex = 0;
      this.openUpvalues = createdUpvalue;
    } else {
      createdUpvalue.upvalueIndex = prevUpvalue.upvalueIndex + 1;
      prevUpvalue.next = createdUpvalue;
    }

    return createdUpvalue;
  }

  /**
   * Close an upvalue at a given index in the stack
   * @param stackIndex
   */
  private closeUpvalues(stackIndex: number): void {
    const last = this.stack[stackIndex];
    while (this.openUpvalues !== undefined && this.openUpvalues.location >= last) {
      const upvalue = this.openUpvalues;
      upvalue.closed = upvalue.location;
      upvalue.location = upvalue.closed;
      this.openUpvalues = upvalue.next;
    }
  }

  private resetStack(): void {
    this.stackTop = 0;
    this.frameCount = 0;
    this.openUpvalues = undefined;
  }

  private runtimeError(message: string): void {
    this.environment.stderr(`runtime error: ${message}`);
    this.environment.stderr('\n');

    for (let i = this.frameCount - 1; i >= 0; i--) {
      const frame = this.frames[i];
      const { func } = frame.closure;
      const instruction = func.chunk.code[frame.instructionIndex - 1];
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
  private binaryOperator(valueType: typeof Value.numberValue | typeof Value.booleanValue, op: BinaryOperator): void {
    if (!this.peek().isNumber() || !this.peek(1).isNumber()) {
      this.runtimeError('Operands must be numbers');
      throw new Error('OPERANDS_ARE_NOT_NUMBER');
    }

    const b = this.pop().asNumber();
    const a = this.pop().asNumber();

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
    const b = LoxString.asString(this.pop());
    const a = LoxString.asString(this.pop());

    const string = a.chars.concat(b.chars);
    if (this.strings.has(string)) {
      this.push(Value.objectValue(this.strings.get(string)!));
    } else {
      const result = new LoxString(string);
      this.push(Value.objectValue(result));
      this.strings.set(string, result);
    }
  }
}
