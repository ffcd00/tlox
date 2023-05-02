import { Chunk } from './chunk';
import { ObjectType } from './enum';
import { Value } from './value';

export abstract class LoxObject {
  public abstract type: ObjectType;

  public static objectType(value: Value): ObjectType {
    return value.asObject().type;
  }

  public static isObjectType(value: Value, type: ObjectType): boolean {
    return value.isObject() && value.asObject().type === type;
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
    return value.asObject() as LoxString;
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
    return value.asObject() as LoxFunction;
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
    return value.asObject() as LoxClosure;
  }

  public override toString(): string {
    return this.func.toString();
  }
}

export class LoxClass extends LoxObject {
  public type = ObjectType.CLASS;

  public name: LoxString;

  constructor(name: LoxString) {
    super();
    this.name = name;
  }

  public static isClass(value: Value): boolean {
    return LoxObject.isObjectType(value, ObjectType.CLASS);
  }

  public static asClass(value: Value): LoxClass {
    return value.asObject() as LoxClass;
  }

  public override toString(): string {
    return this.name.chars;
  }
}

export class LoxInstance extends LoxObject {
  public type = ObjectType.INSTANCE;

  public klass: LoxClass;

  public fields: Map<string, Value>;

  constructor(klass: LoxClass) {
    super();
    this.klass = klass;
    this.fields = new Map<string, Value>();
  }

  public static isInstance(value: Value): boolean {
    return LoxObject.isObjectType(value, ObjectType.INSTANCE);
  }

  public static asInstance(value: Value): LoxInstance {
    return value.asObject() as LoxInstance;
  }

  public override toString(): string {
    return `${this.klass.name.chars} instance`;
  }
}
