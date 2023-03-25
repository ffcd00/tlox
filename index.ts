import { Chunk } from './src/chunk';
import { Compiler } from './src/compiler';
import { DebugUtil } from './src/debug';
import { Scanner } from './src/scanner';
import { VM } from './src/vm';

function main(): void {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil(chunk);
  const compiler = new Compiler(chunk, scanner);
  const vm = new VM(chunk, compiler, debugUtil);

  vm.initVM();
  vm.interpret('1 + 2 + 3');
}

main();
