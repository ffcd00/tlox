import { interpret } from './src';

function main(): void {
  const source = '!!(5 - 4 > 3 * 2 == !nil)';
  interpret(source);
}

main();
