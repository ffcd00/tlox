import { Chunk } from './chunk';
import { asObject, isObject, Value } from './value';

export enum ObjectType {
  FUNCTION,
  STRING,
}

export interface LoxObject {
  type: ObjectType;
}

export class ObjectString implements LoxObject {
  public type = ObjectType.STRING;

  public length: number = 0;

  public chars: string = '';

  constructor(chars: string) {
    this.chars = chars;
    this.length = chars.length;
  }
}

export class ObjectFunction implements LoxObject {
  public type = ObjectType.FUNCTION;

  public arity: number;

  public chunk: Chunk;

  public name: ObjectString;

  constructor(arity: number, chunk: Chunk, name: ObjectString) {
    this.arity = arity;
    this.chunk = chunk;
    this.name = name;
  }
}

export function objectType(value: Value): ObjectType {
  return asObject(value).type;
}

export function isObjectType(value: Value, type: ObjectType): boolean {
  return isObject(value) && asObject(value).type === type;
}

export function isString(value: Value): boolean {
  return isObjectType(value, ObjectType.STRING);
}

export function isFunction(value: Value): boolean {
  return isObjectType(value, ObjectType.FUNCTION);
}

export function asString(value: Value): ObjectString {
  return asObject(value) as ObjectString;
}

export function asFunction(value: Value): ObjectFunction {
  return asObject(value) as ObjectFunction;
}

export function allocateString(chars: string): ObjectString {
  return new ObjectString(chars);
}

export function printFunction(func: ObjectFunction): string {
  return `<fn ${func.name.chars}>`;
}

export function printObject(value: Value): string {
  switch (objectType(value)) {
    case ObjectType.FUNCTION:
      return printFunction(asFunction(value));
    case ObjectType.STRING:
      return asString(value).chars;
  }
}
