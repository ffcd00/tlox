import { interpret } from './src';

function main(): void {
  const source = '"abc" + "cd" == "abc" + "cd"';
  interpret(source);
}

main();
