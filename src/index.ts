import { Chunk } from './chunk';
import { Compiler } from './compiler';
import { DebugUtil } from './debug';
import { Emitter } from './emitter';
import { InterpretResult } from './enum';
import { Environment } from './environment';
import { Parser } from './parser';
import { Scanner } from './scanner';
import { VirtualMachine } from './vm';

export function interpret(source: string, environment: Environment = new Environment()): InterpretResult {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil(chunk);
  const parser = new Parser();
  const emitter = new Emitter(chunk, parser);
  const compiler = new Compiler(chunk, scanner, parser, emitter, environment);

  if (!compiler.compile(source)) {
    return InterpretResult.COMPILE_ERROR;
  }

  const vm = new VirtualMachine(chunk, debugUtil, environment);
  vm.initVM();
  const result = vm.run();

  return result;
}
