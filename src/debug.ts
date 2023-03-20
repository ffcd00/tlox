import { chunk, constants } from "./chunk";
import { OpCode } from "./common";

const OP_NAME_PADDING = 16;

function simpleInstruction(
  name: string,
  offset: number,
  message: string
): number {
  console.log(`${message} ${name.padEnd(OP_NAME_PADDING, " ")}`);
  return offset + 1;
}

function constantInstruction(
  name: string,
  offset: number,
  message: string
): number {
  const constantIndex = chunk[offset + 1];
  if (constantIndex !== undefined) {
    const constant = constants[constantIndex];
    console.log(
      `${message} ${name.padEnd(
        OP_NAME_PADDING,
        " "
      )} ${constantIndex} ${constant}`
    );
    return offset + 2;
  }
  console.error(`Error: constant not found at index ${offset + 1}`);
  return offset + 1;
}

function disassembleInstruction(offset: number): number {
  const message = String(offset).padStart(4, "0");

  const instruction = chunk[offset];
  switch (instruction) {
    case OpCode.OP_RETURN:
      return simpleInstruction("OP_RETURN", offset, message);
    case OpCode.OP_CONSTANT:
      return constantInstruction("OP_CONSTANT", offset, message);
    default:
      console.log(`Unknown opcode ${instruction}`);
      return offset + 1;
  }
}

export function disassembleChunk(name: string): void {
  console.log(`== ${name} ==`);

  for (let offset = 0; offset < chunk.length; ) {
    offset = disassembleInstruction(offset);
  }
}

