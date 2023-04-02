import { Token } from './scanner';

export class Parser {
  public current!: Token;

  public previous!: Token;

  public hadError: boolean = false;

  public panicMode: boolean = false;
}
