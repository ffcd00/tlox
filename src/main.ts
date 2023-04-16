import { readFile } from 'fs';
import { createInterface } from 'readline';
import { Chunk } from './chunk';
import { Compiler } from './compiler';
import { DebugUtil } from './debug';
import { Emitter } from './emitter';
import { InterpretResult } from './enum';
import { Environment } from './environment';
import { Parser } from './parser';
import { Scanner } from './scanner';
import { VirtualMachine } from './vm';

function interpret(source: string, environment: Environment = new Environment()): InterpretResult {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil();
  const parser = new Parser();
  const emitter = new Emitter(parser);
  const compiler = new Compiler(scanner, parser, emitter, environment);

  const func = compiler.compile(source);

  if (func === null) {
    return InterpretResult.COMPILE_ERROR;
  }

  const vm = new VirtualMachine(chunk, debugUtil, environment);
  vm.initVM();
  const result = vm.run(func);

  return result;
}

function repl(): void {
  const chunk = new Chunk();
  const scanner = new Scanner();
  const debugUtil = new DebugUtil();
  const parser = new Parser();
  const emitter = new Emitter(parser);
  const environment = new Environment();
  const compiler = new Compiler(scanner, parser, emitter, environment);
  const vm = new VirtualMachine(chunk, debugUtil, environment);
  vm.initVM();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  console.log('Welcome to tlox REPL');
  console.log('To exit, press Ctrl+C or type exit');

  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', (line) => {
    if (line.trim().toLowerCase() === 'exit') {
      process.exit(0);
    }

    const func = compiler.compile(line);

    if (func !== null) {
      vm.run(func);
    }

    scanner.reset();

    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });
}

function runFile(path: string): void {
  readFile(path, 'utf8', (err, source) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    interpret(source);
  });
}

function run(): void {
  const args = process.argv;

  if (args.length < 3) {
    repl();
  } else if (args.length === 3) {
    runFile(args[2]);
  } else {
    console.error('Usage: tlox [path]');
    process.exit(64);
  }
}

export { run, interpret };
