import { Chunk } from './chunk';
import { Compiler } from './compiler';
import { DebugUtil } from './debug';
import { Scanner } from './scanner';
import { InterpretResult, VM } from './vm';

export function interpret(source: string): InterpretResult {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil(chunk);
  const compiler = new Compiler(chunk, scanner);

  if (!compiler.compile(source)) {
    return InterpretResult.COMPILE_ERROR;
  }

  const vm = new VM(chunk, debugUtil);
  vm.initVM();
  const result = vm.run();

  return result;
}
