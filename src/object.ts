import { Chunk } from './chunk';
import { ObjectType } from './enum';
import { asObject, isObject, Value } from './value';

export abstract class LoxObject {
  public abstract type: ObjectType;

  public static objectType(value: Value): ObjectType {
    return asObject(value).type;
  }

  public static isObjectType(value: Value, type: ObjectType): boolean {
    return isObject(value) && asObject(value).type === type;
  }
}

export class LoxString extends LoxObject {
  public type = ObjectType.STRING;

  public length: number = 0;

  public chars: string = '';

  constructor(chars: string) {
    super();
    this.chars = chars;
    this.length = chars.length;
  }

  public static isString(value: Value): boolean {
    return LoxObject.isObjectType(value, ObjectType.STRING);
  }

  public static asString(value: Value): LoxString {
    return asObject(value) as LoxString;
  }

  public override toString(): string {
    return this.chars;
  }
}

export class LoxFunction extends LoxObject {
  public type = ObjectType.FUNCTION;

  public arity: number;

  public chunk: Chunk;

  public name: LoxString;

  public upvalueCount: number;

  constructor(arity: number, chunk: Chunk, name: LoxString) {
    super();
    this.arity = arity;
    this.chunk = chunk;
    this.name = name;
    this.upvalueCount = 0;
  }

  public static isFunction(value: Value): boolean {
    return LoxObject.isObjectType(value, ObjectType.FUNCTION);
  }

  public static asFunction(value: Value): LoxFunction {
    return asObject(value) as LoxFunction;
  }

  public override toString(): string {
    return `<fn ${this.name.chars}>`;
  }
}

export class LoxUpvalue extends LoxObject {
  public type = ObjectType.UPVALUE;

  public location: Value;

  // eslint-disable-next-line no-use-before-define
  public next: LoxUpvalue | undefined;

  public upvalueIndex: number;

  public closed: Value | undefined;

  constructor(slot: Value) {
    super();
    this.location = slot;
    this.next = undefined;
    this.upvalueIndex = 0;
  }

  public override toString(): string {
    return 'upvalue';
  }
}

export class LoxClosure extends LoxObject {
  public type = ObjectType.CLOSURE;

  public func: LoxFunction;

  public upvalues: LoxUpvalue[];

  public upvalueCount: number;

  constructor(func: LoxFunction) {
    super();
    this.func = func;
    this.upvalues = new Array<LoxUpvalue>(func.upvalueCount);
    this.upvalueCount = func.upvalueCount;
  }

  public static isClosure(value: Value): boolean {
    return LoxObject.isObjectType(value, ObjectType.CLOSURE);
  }

  public static asClosure(value: Value): LoxClosure {
    return asObject(value) as LoxClosure;
  }

  public override toString(): string {
    return this.func.toString();
  }
}
