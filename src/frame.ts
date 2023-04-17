import { ObjectClosure } from './object';

export class CallFrame {
  /**
   * The closure of the function that is being called
   */
  public closure: ObjectClosure;

  /**
   * The instruction index of the function's bytecode
   */
  public instructionIndex: number;

  /**
   * The starting index of the call frame window in the stack
   */
  public slotIndex: number;

  constructor(closure: ObjectClosure, instructionIndex: number, slotIndex: number) {
    this.closure = closure;
    this.instructionIndex = instructionIndex;
    this.slotIndex = slotIndex;
  }
}
