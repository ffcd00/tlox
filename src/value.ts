import { ValueType } from './enum';
import { LoxObject } from './object';

export class Value extends Object {
  public type: ValueType;

  public as: boolean | number | LoxObject;

  constructor(type: ValueType, as: boolean | number | LoxObject) {
    super();
    this.type = type;
    this.as = as;
  }

  public asBoolean(): boolean {
    return this.as as boolean;
  }

  public asNumber(): number {
    return this.as as number;
  }

  public asObject(): LoxObject {
    return this.as as LoxObject;
  }

  public isBoolean(): boolean {
    return this.type === ValueType.BOOLEAN;
  }

  public isNil(): boolean {
    return this.type === ValueType.NIL;
  }

  public isNumber(): boolean {
    return this.type === ValueType.NUMBER;
  }

  public isObject(): boolean {
    return this.type === ValueType.OBJECT;
  }

  public isFalsy(): boolean {
    return this.isNil() || (this.isBoolean() && !this.asBoolean());
  }

  public equals(other: Value): boolean {
    if (this.type !== other.type) {
      return false;
    }

    switch (this.type) {
      case ValueType.BOOLEAN:
        return this.asBoolean() === other.asBoolean();
      case ValueType.NIL:
        return true;
      case ValueType.NUMBER:
        return this.asNumber() === other.asNumber();
      case ValueType.OBJECT: {
        return this.asObject() === other.asObject();
      }
    }
  }

  public override toString(): string {
    switch (this.type) {
      case ValueType.BOOLEAN:
        return String(this.as);
      case ValueType.NIL:
        return 'nil';
      case ValueType.NUMBER:
        return Object.is(this.as, -0) ? '-0' : String(this.as);
      case ValueType.OBJECT:
        return this.as.toString();
    }
  }

  public static booleanValue(value: boolean): Value {
    return new Value(ValueType.BOOLEAN, value);
  }

  public static nilValue(): Value {
    return new Value(ValueType.NIL, 0);
  }

  public static numberValue(value: number): Value {
    return new Value(ValueType.NUMBER, value);
  }

  public static objectValue(value: LoxObject): Value {
    return new Value(ValueType.OBJECT, value);
  }
}
