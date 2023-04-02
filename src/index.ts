import { Chunk } from './chunk';
import { Compiler } from './compiler';
import { DebugUtil } from './debug';
import { Emitter } from './emitter';
import { InterpretResult } from './enum';
import { Parser } from './parser';
import { Scanner } from './scanner';
import { VM } from './vm';

export function interpret(source: string): InterpretResult {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil(chunk);
  const parser = new Parser();
  const emitter = new Emitter(chunk, parser);
  const compiler = new Compiler(chunk, scanner, parser, emitter);

  if (!compiler.compile(source)) {
    return InterpretResult.COMPILE_ERROR;
  }

  const vm = new VM(chunk, debugUtil);
  vm.initVM();
  const result = vm.run();

  return result;
}
