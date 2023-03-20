import type { OpCode } from "./common";
import type { Value } from "./value";

export type Chunk = Array<OpCode>;

export type Constants = Array<Value>;

export const chunk: Chunk = new Array<OpCode>();

export const constants: Constants = new Array<Value>();

export function writeChunk(opcode: OpCode) {
  chunk.push(opcode);
}

export function addConstant(value: Value) {
  constants.push(value);
  return constants.length - 1;
}

