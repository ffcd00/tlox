import type { Chunk } from './chunk';
import { OpCode } from './common';
import { allocateString } from './object';
import { Scanner, Token, TokenType } from './scanner';
import { numberValue, objectValue, Value } from './value';

export enum Precedence {
  NONE,
  ASSIGNMENT, // =
  OR, // or
  AND, // and
  EQUALITY, // == !=
  COMPARISON, // < > <= >=
  TERM, // + -
  FACTOR, // * /
  UNARY, // ! -
  CALL, // . ()
  PRIMARY,
}

type ParseFn = (source: string) => void;

interface ParseRule {
  prefix: ParseFn | undefined;

  infix: ParseFn | undefined;

  precedence: Precedence;
}

class Parser {
  public current!: Token;

  public previous!: Token;

  public hadError: boolean = false;

  public panicMode: boolean = false;
}

export class Compiler {
  private readonly parser: Parser;

  /**
   * `strings` is a mapping between declared string constants and
   * their corresponding indices in the constant pool, which is
   * useful for string interning in compile time.
   */
  private readonly strings: Map<string, number>;

  constructor(private readonly chunk: Chunk, private readonly scanner: Scanner) {
    this.parser = new Parser();
    this.strings = new Map<string, number>();
  }

  public compile(source: string): boolean {
    this.advance(source);
    this.expression(source);
    // this.consume(source, TokenType.EOF, 'Expect end of expression');
    this.endCompiler();
    return !this.parser.hadError;
  }

  private advance(source: string): void {
    this.parser.previous = this.parser.current;

    for (;;) {
      this.parser.current = this.scanner.scanToken(source);
      if (this.parser.current.type !== TokenType.ERROR) {
        break;
      }

      this.errorAtCurrent(this.parser.current.message);
    }
  }

  private consume(source: string, type: TokenType, message: string): void {
    if (this.parser.current.type === type) {
      this.advance(source);
      return;
    }

    this.errorAtCurrent(message);
  }

  private emitByte(byte: OpCode): void {
    this.chunk.writeChunk(byte, this.parser.previous.line);
  }

  private emitBytes(byte1: OpCode, byte2: OpCode): void {
    this.emitByte(byte1);
    this.emitByte(byte2);
  }

  private emitReturn(): void {
    this.emitByte(OpCode.OP_RETURN);
  }

  private makeConstant(value: Value): number {
    const constant = this.chunk.addConstant(value);

    return constant;
  }

  /**
   *
   * @param value
   * @returns The index of value in the constant pool
   */
  private emitConstant(value: Value): number {
    const index = this.makeConstant(value);
    this.emitBytes(OpCode.OP_CONSTANT, index);
    return index;
  }

  private endCompiler(): void {
    this.emitReturn();
  }

  private grouping(source: string): void {
    this.expression(source);
    this.consume(source, TokenType.RIGHT_PAREN, "Expect ')' after expression");
  }

  private number(source: string): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const value = parseFloat(source.substring(token.start, token.start + token.length));
      this.emitConstant(numberValue(value));
    }
  }

  private string(source: string): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const sourceString = source.substring(token.start + 1, token.start + token.length - 1);
      if (this.strings.has(sourceString)) {
        // intern string
        this.emitBytes(OpCode.OP_CONSTANT, this.strings.get(sourceString)!);
      } else {
        const string = allocateString(sourceString);
        const index = this.emitConstant(objectValue(string));
        this.strings.set(sourceString, index);
      }
    }
  }

  private unary(source: string): void {
    const operatorType = this.parser.previous.type;

    this.parsePrecedence(source, Precedence.UNARY);

    switch (operatorType) {
      case TokenType.BANG:
        this.emitByte(OpCode.OP_NOT);
        break;
      case TokenType.MINUS:
        this.emitByte(OpCode.OP_NEGATE);
        break;
    }
  }

  private binary(source: string): void {
    const operatorType = this.parser.previous.type;
    const rule = this.getRule(operatorType);
    this.parsePrecedence(source, rule.precedence + 1);

    switch (operatorType) {
      case TokenType.BANG_EQUAL:
        this.emitBytes(OpCode.OP_EQUAL, OpCode.OP_NOT);
        break;
      case TokenType.EQUAL_EQUAL:
        this.emitByte(OpCode.OP_EQUAL);
        break;
      case TokenType.GREATER:
        this.emitByte(OpCode.OP_GREATER);
        break;
      case TokenType.GREATER_EQUAL:
        this.emitBytes(OpCode.OP_LESS, OpCode.OP_NOT);
        break;
      case TokenType.LESS:
        this.emitByte(OpCode.OP_LESS);
        break;
      case TokenType.LESS_EQUAL:
        this.emitBytes(OpCode.OP_GREATER, OpCode.OP_NOT);
        break;
      case TokenType.PLUS:
        this.emitByte(OpCode.OP_ADD);
        break;
      case TokenType.MINUS:
        this.emitByte(OpCode.OP_SUBTRACT);
        break;
      case TokenType.STAR:
        this.emitByte(OpCode.OP_MULTIPLY);
        break;
      case TokenType.SLASH:
        this.emitByte(OpCode.OP_DIVIDE);
        break;
    }
  }

  private literal(): void {
    switch (this.parser.previous.type) {
      case TokenType.FALSE:
        this.emitByte(OpCode.OP_FALSE);
        break;
      case TokenType.NIL:
        this.emitByte(OpCode.OP_NIL);
        break;
      case TokenType.TRUE:
        this.emitByte(OpCode.OP_TRUE);
        break;
    }
  }

  private parsePrecedence(source: string, precedence: Precedence): void {
    this.advance(source);
    const prefixRule = this.getRule(this.parser.previous.type).prefix;

    if (prefixRule === undefined) {
      this.error('Expect expression');
      return;
    }

    Reflect.apply(prefixRule, this, [source]);

    while (precedence <= this.getRule(this.parser.current.type).precedence) {
      this.advance(source);
      const infixRule = this.getRule(this.parser.previous.type).infix;

      if (infixRule !== undefined) {
        Reflect.apply(infixRule, this, [source]);
      }
    }
  }

  private expression(source: string): void {
    this.parsePrecedence(source, Precedence.ASSIGNMENT);
  }

  private error(message: string): void {
    this.errorAt(this.parser.previous, message);
  }

  private errorAtCurrent(message: string): void {
    this.errorAt(this.parser.current, message);
  }

  private errorAt(token: Token, message: string): void {
    if (this.parser.panicMode) {
      return;
    }

    this.parser.panicMode = true;

    if (token.type === TokenType.EOF) {
      console.error(`[line ${token.line}] Error at end: ${message}`);
    } else if (token.type === TokenType.ERROR) {
      // no-op
    } else {
      console.error(`[line ${token.line}] Error: ${message}`);
    }

    this.parser.hadError = true;
  }

  private getRule(type: TokenType): ParseRule {
    return this.rules[type];
  }

  private static makeParseRule(
    prefix: ParseFn | undefined = undefined,
    infix: ParseFn | undefined = undefined,
    precedence: Precedence = Precedence.NONE
  ): ParseRule {
    return { prefix, infix, precedence };
  }

  private rules: { [key in TokenType]: ParseRule } = {
    [TokenType.LEFT_PAREN]: Compiler.makeParseRule(this.grouping),
    [TokenType.RIGHT_PAREN]: Compiler.makeParseRule(),
    [TokenType.LEFT_BRACE]: Compiler.makeParseRule(),
    [TokenType.RIGHT_BRACE]: Compiler.makeParseRule(),
    [TokenType.COMMA]: Compiler.makeParseRule(),
    [TokenType.DOT]: Compiler.makeParseRule(),
    [TokenType.MINUS]: Compiler.makeParseRule(this.unary, this.binary, Precedence.TERM),
    [TokenType.PLUS]: Compiler.makeParseRule(undefined, this.binary, Precedence.TERM),
    [TokenType.SEMICOLON]: Compiler.makeParseRule(),
    [TokenType.SLASH]: Compiler.makeParseRule(undefined, this.binary, Precedence.FACTOR),
    [TokenType.STAR]: Compiler.makeParseRule(undefined, this.binary, Precedence.FACTOR),
    [TokenType.BANG]: Compiler.makeParseRule(this.unary),
    [TokenType.BANG_EQUAL]: Compiler.makeParseRule(undefined, this.binary, Precedence.EQUALITY),
    [TokenType.EQUAL]: Compiler.makeParseRule(),
    [TokenType.EQUAL_EQUAL]: Compiler.makeParseRule(undefined, this.binary, Precedence.EQUALITY),
    [TokenType.GREATER]: Compiler.makeParseRule(undefined, this.binary, Precedence.COMPARISON),
    [TokenType.GREATER_EQUAL]: Compiler.makeParseRule(undefined, this.binary, Precedence.COMPARISON),
    [TokenType.LESS]: Compiler.makeParseRule(undefined, this.binary, Precedence.COMPARISON),
    [TokenType.LESS_EQUAL]: Compiler.makeParseRule(undefined, this.binary, Precedence.COMPARISON),
    [TokenType.IDENTIFIER]: Compiler.makeParseRule(),
    [TokenType.STRING]: Compiler.makeParseRule(this.string),
    [TokenType.NUMBER]: Compiler.makeParseRule(this.number),
    [TokenType.AND]: Compiler.makeParseRule(),
    [TokenType.CLASS]: Compiler.makeParseRule(),
    [TokenType.ELSE]: Compiler.makeParseRule(),
    [TokenType.FALSE]: Compiler.makeParseRule(this.literal),
    [TokenType.FOR]: Compiler.makeParseRule(),
    [TokenType.FUN]: Compiler.makeParseRule(),
    [TokenType.IF]: Compiler.makeParseRule(),
    [TokenType.NIL]: Compiler.makeParseRule(this.literal),
    [TokenType.OR]: Compiler.makeParseRule(),
    [TokenType.PRINT]: Compiler.makeParseRule(),
    [TokenType.RETURN]: Compiler.makeParseRule(),
    [TokenType.SUPER]: Compiler.makeParseRule(),
    [TokenType.THIS]: Compiler.makeParseRule(),
    [TokenType.TRUE]: Compiler.makeParseRule(this.literal),
    [TokenType.VAR]: Compiler.makeParseRule(),
    [TokenType.WHILE]: Compiler.makeParseRule(),
    [TokenType.ERROR]: Compiler.makeParseRule(),
    [TokenType.EOF]: Compiler.makeParseRule(),
  };
}
