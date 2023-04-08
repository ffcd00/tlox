import type { Chunk } from './chunk';
import { UINT8_COUNT } from './common';
import { Emitter } from './emitter';
import { OpCode, Precedence, TokenType } from './enum';
import { Environment } from './environment';
import { allocateString } from './object';
import { Parser } from './parser';
import { Scanner, Token } from './scanner';
import { numberValue, objectValue, Value } from './value';

type ParseFn = (canAssign: boolean) => void;

interface ParseRule {
  prefix: ParseFn | undefined;

  infix: ParseFn | undefined;

  precedence: Precedence;
}

class Local {
  public name: Token;

  public depth: number;

  constructor(name: Token, depth: number) {
    this.name = name;
    this.depth = depth;
  }
}

export class Compiler {
  private source!: string;

  /**
   * `strings` is a mapping between declared string constants and
   * their corresponding indices in the constant pool, which is
   * useful for string interning in compile time.
   */
  private readonly strings: Map<string, number>;

  private readonly locals: Array<Local>;

  private localCount: number;

  private scopeDepth: number;

  constructor(
    private readonly chunk: Chunk,
    private readonly scanner: Scanner,
    private readonly parser: Parser,
    private readonly emitter: Emitter,
    private readonly environment: Environment
  ) {
    this.strings = new Map<string, number>();
    this.locals = new Array<Local>(UINT8_COUNT + 1);
    this.localCount = 0;
    this.scopeDepth = 0;
  }

  public compile(source: string): boolean {
    this.source = source;
    this.advance();

    while (!this.match(TokenType.EOF)) {
      this.declaration();
    }

    this.endCompiler();
    return !this.parser.hadError;
  }

  private advance(): void {
    this.parser.previous = this.parser.current;

    for (;;) {
      this.parser.current = this.scanner.scanToken(this.source);
      if (this.parser.current.type !== TokenType.ERROR) {
        break;
      }

      this.errorAtCurrent(this.parser.current.message);
    }
  }

  private consume(type: TokenType, message: string): void {
    if (this.parser.current.type === type) {
      this.advance();
      return;
    }

    this.errorAtCurrent(message);
  }

  private check(type: TokenType): boolean {
    return this.parser.current.type === type;
  }

  private match(type: TokenType): boolean {
    if (!this.check(type)) {
      return false;
    }
    this.advance();
    return true;
  }

  private endCompiler(): void {
    this.emitter.emitReturn();
    this.source = '';
  }

  private grouping(): void {
    this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression");
  }

  private number(): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const value = parseFloat(this.source.substring(token.start, token.start + token.length));
      this.emitter.emitConstant(numberValue(value));
    }
  }

  private string(): void {
    const token = this.parser.previous;
    if (token.type !== TokenType.ERROR) {
      const sourceString = this.source.substring(token.start + 1, token.start + token.length - 1);
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
  private namedVariable(name: Token, canAssign: boolean): void {
    let arg = this.resolveLocal(name);
    let getOp: OpCode;
    let setOp: OpCode;
    if (arg !== -1) {
      getOp = OpCode.OP_GET_LOCAL;
      setOp = OpCode.OP_SET_LOCAL;
    } else {
      arg = this.identifierConstant(name);
      getOp = OpCode.OP_GET_GLOBAL;
      setOp = OpCode.OP_SET_GLOBAL;
    }

    if (canAssign && this.match(TokenType.EQUAL)) {
      this.expression();
      this.emitter.emitBytes(setOp, arg);
    } else {
      this.emitter.emitBytes(getOp, arg);
    }
  }

  private variable(canAssign: boolean): void {
    this.namedVariable(this.parser.previous, canAssign);
  }

  private unary(): void {
    const operatorType = this.parser.previous.type;

    this.parsePrecedence(Precedence.UNARY);

    switch (operatorType) {
      case TokenType.BANG:
        this.emitter.emitByte(OpCode.OP_NOT);
        break;
      case TokenType.MINUS:
        this.emitter.emitByte(OpCode.OP_NEGATE);
        break;
    }
  }

  private binary(): void {
    const operatorType = this.parser.previous.type;
    const rule = this.getRule(operatorType);
    this.parsePrecedence(rule.precedence + 1);

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

  private parsePrecedence(precedence: Precedence): void {
    this.advance();
    const prefixRule = this.getRule(this.parser.previous.type).prefix;

    if (prefixRule === undefined) {
      this.error('Expect expression');
      return;
    }

    const canAssign = precedence <= Precedence.ASSIGNMENT;
    Reflect.apply(prefixRule, this, [canAssign]);

    while (precedence <= this.getRule(this.parser.current.type).precedence) {
      this.advance();
      const infixRule = this.getRule(this.parser.previous.type).infix;

      if (infixRule !== undefined) {
        Reflect.apply(infixRule, this, [canAssign]);
      }

      if (canAssign && this.match(TokenType.EQUAL)) {
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
  private identifierConstant(name: Token): number {
    if (name.type !== TokenType.ERROR) {
      return this.emitter.makeConstant(
        objectValue(allocateString(this.source.substring(name.start, name.start + name.length)))
      );
    }
    return -1;
  }

  /**
   * Check if two identifiers are the same
   * @param a Token
   * @param b Token
   */
  private identifiersEqual(a: Token, b: Token): boolean {
    if (a.type !== TokenType.ERROR && b.type !== TokenType.ERROR) {
      if (
        a.length === b.length &&
        this.source.substring(a.start, a.start + a.length) === this.source.substring(b.start, b.start + b.length)
      ) {
        return true;
      }
    }
    return false;
  }

  private resolveLocal(name: Token): number {
    for (let i = this.localCount - 1; i >= 0; i -= 1) {
      const local = this.locals[i];
      if (this.identifiersEqual(name, local.name)) {
        if (local.depth === -1) {
          this.error("Can't read local variable in its own initializer.");
        }
        return i;
      }
    }

    return -1;
  }

  private addLocal(name: Token): void {
    if (this.localCount === UINT8_COUNT) {
      this.error('Too many local variables in function.');
      return;
    }

    const local = new Local(name, -1);
    this.locals[this.localCount] = local;
    this.localCount += 1;
  }

  private declareVariable(): void {
    if (this.scopeDepth === 0) {
      return;
    }

    const name = this.parser.previous;

    for (let i = this.localCount - 1; i >= 0; i -= 1) {
      const local = this.locals[i];
      if (local.depth !== -1 && local.depth < this.scopeDepth) {
        break;
      }

      if (this.identifiersEqual(name, local.name)) {
        this.error('Already a variable with this name in this scope.');
      }
    }

    this.addLocal(name);
  }

  /**
   *
   * @param The index of the variable’s name in the constant pool
   */
  private defineVariable(global: number): void {
    if (this.scopeDepth > 0) {
      this.markInitialized();
      return;
    }
    this.emitter.emitBytes(OpCode.OP_DEFINE_GLOBAL, global);
  }

  private parseVariable(errorMessage: string): number {
    this.consume(TokenType.IDENTIFIER, errorMessage);

    this.declareVariable();
    if (this.scopeDepth > 0) {
      /**
       * variable is declared in a local scope and there's no need
       * to add variable's name to the constant pool.
       */
      return 0;
    }

    return this.identifierConstant(this.parser.previous);
  }

  private markInitialized(): void {
    this.locals[this.localCount - 1].depth = this.scopeDepth;
  }

  private expression(): void {
    this.parsePrecedence(Precedence.ASSIGNMENT);
  }

  private block(): void {
    while (!this.check(TokenType.RIGHT_BRACE) && !this.check(TokenType.EOF)) {
      this.declaration();
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
  }

  private varDeclaration(): void {
    const global = this.parseVariable('Expect variable name');

    if (this.match(TokenType.EQUAL)) {
      this.expression();
    } else {
      this.emitter.emitByte(OpCode.OP_NIL);
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration");

    this.defineVariable(global);
  }

  private declaration(): void {
    if (this.match(TokenType.VAR)) {
      this.varDeclaration();
    } else {
      this.statement();
    }

    if (this.parser.panicMode) {
      this.synchronize();
    }
  }

  private statement(): void {
    if (this.match(TokenType.PRINT)) {
      this.printStatement();
    } else if (this.match(TokenType.LEFT_BRACE)) {
      this.beginScope();
      this.block();
      this.endScope();
    } else {
      this.expressionStatement();
    }
  }

  private printStatement(): void {
    this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    this.emitter.emitByte(OpCode.OP_PRINT);
  }

  private expressionStatement(): void {
    this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    this.emitter.emitByte(OpCode.OP_POP);
  }

  private beginScope(): void {
    this.scopeDepth += 1;
  }

  private endScope(): void {
    this.scopeDepth -= 1;

    while (this.localCount > 0 && this.locals[this.localCount - 1].depth > this.scopeDepth) {
      this.emitter.emitByte(OpCode.OP_POP);
      this.localCount -= 1;
    }
  }

  private synchronize(): void {
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

      this.advance();
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
