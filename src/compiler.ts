import type { Chunk } from './chunk';
import { Emitter } from './emitter';
import { OpCode, Precedence, TokenType } from './enum';
import { Environment } from './environment';
import { allocateString } from './object';
import { Parser } from './parser';
import { Scanner, Token } from './scanner';
import { numberValue, objectValue, Value } from './value';

type ParseFn = (source: string, canAssign: boolean) => void;

interface ParseRule {
  prefix: ParseFn | undefined;

  infix: ParseFn | undefined;

  precedence: Precedence;
}

export class Compiler {
  /**
   * `strings` is a mapping between declared string constants and
   * their corresponding indices in the constant pool, which is
   * useful for string interning in compile time.
   */
  private readonly strings: Map<string, number>;

  constructor(
    private readonly chunk: Chunk,
    private readonly scanner: Scanner,
    private readonly parser: Parser,
    private readonly emitter: Emitter,
    private readonly environment: Environment
  ) {
    this.strings = new Map<string, number>();
  }

  public compile(source: string): boolean {
    this.advance(source);

    while (!this.match(source, TokenType.EOF)) {
      this.declaration(source);
    }

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

  private check(type: TokenType): boolean {
    return this.parser.current.type === type;
  }

  private match(source: string, type: TokenType): boolean {
    if (!this.check(type)) {
      return false;
    }
    this.advance(source);
    return true;
  }

  private endCompiler(): void {
    this.emitter.emitReturn();
  }

  private grouping(source: string): void {
    this.expression(source);
    this.consume(source, TokenType.RIGHT_PAREN, "Expect ')' after expression");
  }

  private number(source: string): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const value = parseFloat(source.substring(token.start, token.start + token.length));
      this.emitter.emitConstant(numberValue(value));
    }
  }

  private string(source: string): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const sourceString = source.substring(token.start + 1, token.start + token.length - 1);
      if (this.strings.has(sourceString)) {
        // intern string
        this.emitter.emitBytes(OpCode.OP_CONSTANT, this.strings.get(sourceString)!);
      } else {
        const string = allocateString(sourceString);
        const index = this.emitter.emitConstant(objectValue(string));
        this.strings.set(sourceString, index);
      }
    }
  }

  /**
   * Taking the given identifier token and add its lexeme to
   * the chunk’s constant table as a string.
   * @param name The name of the declared variable.
   */
  private namedVariable(source: string, name: Token, canAssign: boolean): void {
    const arg = this.identifierConstant(source, name);

    if (canAssign && this.match(source, TokenType.EQUAL)) {
      this.expression(source);
      this.emitter.emitBytes(OpCode.OP_SET_GLOBAL, arg);
    } else {
      this.emitter.emitBytes(OpCode.OP_GET_GLOBAL, arg);
    }
  }

  private variable(source: string, canAssign: boolean): void {
    this.namedVariable(source, this.parser.previous, canAssign);
  }

  private unary(source: string): void {
    const operatorType = this.parser.previous.type;

    this.parsePrecedence(source, Precedence.UNARY);

    switch (operatorType) {
      case TokenType.BANG:
        this.emitter.emitByte(OpCode.OP_NOT);
        break;
      case TokenType.MINUS:
        this.emitter.emitByte(OpCode.OP_NEGATE);
        break;
    }
  }

  private binary(source: string): void {
    const operatorType = this.parser.previous.type;
    const rule = this.getRule(operatorType);
    this.parsePrecedence(source, rule.precedence + 1);

    switch (operatorType) {
      case TokenType.BANG_EQUAL:
        this.emitter.emitBytes(OpCode.OP_EQUAL, OpCode.OP_NOT);
        break;
      case TokenType.EQUAL_EQUAL:
        this.emitter.emitByte(OpCode.OP_EQUAL);
        break;
      case TokenType.GREATER:
        this.emitter.emitByte(OpCode.OP_GREATER);
        break;
      case TokenType.GREATER_EQUAL:
        this.emitter.emitBytes(OpCode.OP_LESS, OpCode.OP_NOT);
        break;
      case TokenType.LESS:
        this.emitter.emitByte(OpCode.OP_LESS);
        break;
      case TokenType.LESS_EQUAL:
        this.emitter.emitBytes(OpCode.OP_GREATER, OpCode.OP_NOT);
        break;
      case TokenType.PLUS:
        this.emitter.emitByte(OpCode.OP_ADD);
        break;
      case TokenType.MINUS:
        this.emitter.emitByte(OpCode.OP_SUBTRACT);
        break;
      case TokenType.STAR:
        this.emitter.emitByte(OpCode.OP_MULTIPLY);
        break;
      case TokenType.SLASH:
        this.emitter.emitByte(OpCode.OP_DIVIDE);
        break;
    }
  }

  private literal(): void {
    switch (this.parser.previous.type) {
      case TokenType.FALSE:
        this.emitter.emitByte(OpCode.OP_FALSE);
        break;
      case TokenType.NIL:
        this.emitter.emitByte(OpCode.OP_NIL);
        break;
      case TokenType.TRUE:
        this.emitter.emitByte(OpCode.OP_TRUE);
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

    const canAssign = precedence <= Precedence.ASSIGNMENT;
    Reflect.apply(prefixRule, this, [source, canAssign]);

    while (precedence <= this.getRule(this.parser.current.type).precedence) {
      this.advance(source);
      const infixRule = this.getRule(this.parser.previous.type).infix;

      if (infixRule !== undefined) {
        Reflect.apply(infixRule, this, [source, canAssign]);
      }

      if (canAssign && this.match(source, TokenType.EQUAL)) {
        this.error('Invalid assignment target.');
      }
    }
  }

  /**
   * The function takes the given token and adds its lexeme to
   * the chunk’s constant table as a string
   * @param source
   * @param name
   * @returns the index of that constant in the constant pool. -1 if
   * trying to add `TokenType.ERROR` to the constant pool.
   */
  private identifierConstant(source: string, name: Token): number {
    if (name.type !== TokenType.ERROR) {
      return this.emitter.makeConstant(
        objectValue(allocateString(source.substring(name.start, name.start + name.length)))
      );
    }
    return -1;
  }

  private parseVariable(source: string, errorMessage: string): number {
    this.consume(source, TokenType.IDENTIFIER, errorMessage);
    return this.identifierConstant(source, this.parser.previous);
  }

  private expression(source: string): void {
    this.parsePrecedence(source, Precedence.ASSIGNMENT);
  }

  private varDeclaration(source: string): void {
    const global = this.parseVariable(source, 'Expect variable name');

    if (this.match(source, TokenType.EQUAL)) {
      this.expression(source);
    } else {
      this.emitter.emitByte(OpCode.OP_NIL);
    }

    this.consume(source, TokenType.SEMICOLON, "Expect ';' after variable declaration");
    this.emitter.defineVariable(global);
  }

  private declaration(source: string): void {
    if (this.match(source, TokenType.VAR)) {
      this.varDeclaration(source);
    } else {
      this.statement(source);
    }

    if (this.parser.panicMode) {
      this.synchronize(source);
    }
  }

  private statement(source: string): void {
    if (this.match(source, TokenType.PRINT)) {
      this.printStatement(source);
    } else {
      this.expressionStatement(source);
    }
  }

  private printStatement(source: string): void {
    this.expression(source);
    this.consume(source, TokenType.SEMICOLON, "Expect ';' after value.");
    this.emitter.emitByte(OpCode.OP_PRINT);
  }

  private expressionStatement(source: string): void {
    this.expression(source);
    this.consume(source, TokenType.SEMICOLON, "Expect ';' after expression.");
    this.emitter.emitByte(OpCode.OP_POP);
  }

  private synchronize(source: string): void {
    this.parser.panicMode = false;

    while (this.parser.current.type !== TokenType.EOF) {
      if (this.parser.previous.type === TokenType.SEMICOLON) {
        return;
      }
      switch (this.parser.current.type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
        default:
        // no-op
      }

      this.advance(source);
    }
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
      this.environment.stderr(`[line ${token.line}] Error at end: ${message}`);
    } else if (token.type === TokenType.ERROR) {
      // no-op
    } else {
      this.environment.stderr(`[line ${token.line}] Error: ${message}`);
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
    [TokenType.IDENTIFIER]: Compiler.makeParseRule(this.variable),
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
