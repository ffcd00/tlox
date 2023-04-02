import { asObject, isObject, Value } from './value';

export enum ObjectType {
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

export function objectType(value: Value): ObjectType {
  return asObject(value).type;
}

export function isObjectType(value: Value, type: ObjectType): boolean {
  return isObject(value) && asObject(value).type === type;
}

export function isString(value: Value): boolean {
  return isObjectType(value, ObjectType.STRING);
}

export function asString(value: Value): ObjectString {
  return asObject(value) as ObjectString;
}

export function allocateString(chars: string): ObjectString {
  return new ObjectString(chars);
}

export function printObject(value: Value): string {
  switch (objectType(value)) {
    case ObjectType.STRING:
      return asString(value).chars;
  }
}
