import { ObjectFunction } from './object';
import { Value } from './value';

export class CallFrame {
  public func: ObjectFunction;

  public instructionIndex: number;

  public slots: Value[];

  constructor(func: ObjectFunction, instructionIndex: number, slots: Value[]) {
    this.func = func;
    this.instructionIndex = instructionIndex;
    this.slots = slots;
  }
}
