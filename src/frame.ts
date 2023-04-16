import { ObjectFunction } from './object';

export class CallFrame {
  /**
   * The function being called
   */
  public func: ObjectFunction;

  /**
   * The instruction index of the function's bytecode
   */
  public instructionIndex: number;

  /**
   * The starting index of the call frame window in the stack
   */
  public slotIndex: number;

  constructor(func: ObjectFunction, instructionIndex: number, slotIndex: number) {
    this.func = func;
    this.instructionIndex = instructionIndex;
    this.slotIndex = slotIndex;
  }
}
