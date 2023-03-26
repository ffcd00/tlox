import { asString, LoxObject, printObject } from './object';

export enum ValueType {
  BOOLEAN,
  NIL,
  NUMBER,
  OBJECT,
}

export type Value = {
  type: ValueType;
  as: boolean | number | LoxObject;
};

export type ValueArray = Array<Value>;

export function booleanValue(value: boolean): Value {
  return { type: ValueType.BOOLEAN, as: value };
}

export function nilValue(): Value {
  return { type: ValueType.NIL, as: 0 };
}

export function numberValue(value: number): Value {
  return { type: ValueType.NUMBER, as: value };
}

export function objectValue(value: LoxObject): Value {
  return { type: ValueType.OBJECT, as: value };
}

export function asBoolean(value: Value): boolean {
  return value.as as boolean;
}

export function asNumber(value: Value): number {
  return value.as as number;
}

export function asObject(value: Value): LoxObject {
  return value.as as LoxObject;
}

export function isBoolean(value: Value): boolean {
  return value.type === ValueType.BOOLEAN;
}

export function isNil(value: Value): boolean {
  return value.type === ValueType.NIL;
}

export function isNumber(value: Value): boolean {
  return value.type === ValueType.NUMBER;
}

export function isObject(value: Value): boolean {
  return value.type === ValueType.OBJECT;
}

export function isFalsy(value: Value): boolean {
  return isNil(value) || (isBoolean(value) && !asBoolean(value));
}

export function valuesEqual(a: Value, b: Value): boolean {
  if (a.type !== b.type) {
    return false;
  }

  switch (a.type) {
    case ValueType.BOOLEAN:
      return asBoolean(a) === asBoolean(b);
    case ValueType.NIL:
      return true;
    case ValueType.NUMBER:
      return asNumber(a) === asNumber(b);
    case ValueType.OBJECT: {
      const aString = asString(a);
      const bString = asString(b);

      return aString.length === bString.length && aString === bString;
    }
  }
}

export function printValue(value: Value): string {
  switch (value.type) {
    case ValueType.BOOLEAN:
      return String(value.as);
    case ValueType.NIL:
      return 'nil';
    case ValueType.NUMBER:
      return String(value.as);
    case ValueType.OBJECT:
      return printObject(value);
  }
}
