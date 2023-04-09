import { TokenType } from './enum';

type NormalTokenType = Exclude<TokenType, TokenType.ERROR>;

export type Token =
  | {
      type: NormalTokenType;
      start: number;
      length: number;
      line: number;
    }
  | {
      type: TokenType.ERROR;
      line: number;
      message: string;
    };

export class Scanner {
  private start: number = 0;

  private current: number = 0;

  private line: number = 1;

  public scanToken(source: string): Token {
    this.skipWhitespace(source);
    this.start = this.current;

    if (this.isAtEnd(source)) {
      return this.makeToken(TokenType.EOF);
    }

    const char = this.advance(source);
    if (Scanner.isDigit(char)) {
      return this.number(source);
    }
    if (Scanner.isAlpha(char)) {
      return this.identifier(source);
    }

    switch (char) {
      case '(':
        return this.makeToken(TokenType.LEFT_PAREN);
      case ')':
        return this.makeToken(TokenType.RIGHT_PAREN);
      case '{':
        return this.makeToken(TokenType.LEFT_BRACE);
      case '}':
        return this.makeToken(TokenType.RIGHT_BRACE);
      case ';':
        return this.makeToken(TokenType.SEMICOLON);
      case ',':
        return this.makeToken(TokenType.COMMA);
      case '.':
        return this.makeToken(TokenType.DOT);
      case '-':
        return this.makeToken(TokenType.MINUS);
      case '+':
        return this.makeToken(TokenType.PLUS);
      case '/':
        return this.makeToken(TokenType.SLASH);
      case '*':
        return this.makeToken(TokenType.STAR);
      case '!':
        return this.makeToken(this.match(source, '=') ? TokenType.BANG_EQUAL : TokenType.BANG);
      case '=':
        return this.makeToken(this.match(source, '=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
      case '<':
        return this.makeToken(this.match(source, '=') ? TokenType.LESS_EQUAL : TokenType.LESS);
      case '>':
        return this.makeToken(this.match(source, '=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
      case '"':
        return this.string(source);
    }

    return this.errorToken('Unexpected characters.');
  }

  public reset(): void {
    this.start = 0;
    this.current = 0;
    this.line = 0;
  }

  private makeToken(type: NormalTokenType): Token {
    const token: Token = {
      type,
      start: this.start,
      length: this.current - this.start,
      line: this.line,
    };
    return token;
  }

  private errorToken(message: string): Token {
    const token: Token = {
      type: TokenType.ERROR,
      line: this.line,
      message,
    };
    return token;
  }

  private isAtEnd(source: string): boolean {
    return this.current === source.length;
  }

  private advance(source: string): string {
    this.current += 1;
    return source.charAt(this.current - 1);
  }

  private match(source: string, expected: string): boolean {
    if (this.isAtEnd(source)) {
      return false;
    }
    if (source.charAt(this.current) !== expected) {
      return false;
    }
    this.current += 1;
    return true;
  }

  private skipWhitespace(source: string): void {
    for (;;) {
      switch (this.peek(source)) {
        // whitespace
        case ' ':
        case '\r':
        case '\t':
          this.advance(source);
          break;
        // newline
        case '\n':
          this.line += 1;
          this.advance(source);
          break;
        // comments
        case '/':
          if (this.peekNext(source) === '/') {
            while (this.peek(source) !== '\n' && !this.isAtEnd(source)) {
              this.advance(source);
            }
          } else {
            return;
          }
          break;
        default:
          return;
      }
    }
  }

  private peek(source: string): string {
    return source.charAt(this.current);
  }

  private peekNext(source: string): string {
    if (this.isAtEnd(source)) {
      return '\0';
    }
    return source.charAt(this.current + 1);
  }

  private static isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private static isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private string(source: string): Token {
    while (this.peek(source) !== '"' && !this.isAtEnd(source)) {
      if (this.peek(source) === '\n') {
        this.line += 1;
      }
      this.advance(source);
    }

    if (this.isAtEnd(source)) {
      return this.errorToken('Unterminated string.');
    }

    this.advance(source);
    return this.makeToken(TokenType.STRING);
  }

  private number(source: string): Token {
    while (Scanner.isDigit(this.peek(source))) {
      this.advance(source);
    }

    if (this.peek(source) === '.' && Scanner.isDigit(this.peekNext(source))) {
      this.advance(source);

      while (Scanner.isDigit(this.peek(source))) {
        this.advance(source);
      }
    }

    return this.makeToken(TokenType.NUMBER);
  }

  private identifier(source: string): Token {
    while (Scanner.isAlpha(this.peek(source)) || Scanner.isDigit(this.peek(source))) {
      this.advance(source);
    }

    return this.makeToken(this.identifierType(source));
  }

  private identifierType(source: string): NormalTokenType {
    switch (source.charAt(this.start)) {
      case 'a':
        return this.checkKeyboard(source, 1, 2, 'nd', TokenType.AND);
      case 'c':
        return this.checkKeyboard(source, 1, 4, 'lass', TokenType.CLASS);
      case 'e':
        return this.checkKeyboard(source, 1, 3, 'lse', TokenType.ELSE);
      case 'i':
        return this.checkKeyboard(source, 1, 1, 'f', TokenType.IF);
      case 'n':
        return this.checkKeyboard(source, 1, 2, 'il', TokenType.NIL);
      case 'o':
        return this.checkKeyboard(source, 1, 1, 'r', TokenType.OR);
      case 'p':
        return this.checkKeyboard(source, 1, 4, 'rint', TokenType.PRINT);
      case 'r':
        return this.checkKeyboard(source, 1, 5, 'eturn', TokenType.RETURN);
      case 's':
        return this.checkKeyboard(source, 1, 4, 'uper', TokenType.SUPER);
      case 'v':
        return this.checkKeyboard(source, 1, 2, 'ar', TokenType.VAR);
      case 'w':
        return this.checkKeyboard(source, 1, 4, 'hile', TokenType.WHILE);
      case 'f':
        if (this.current - this.start > 1) {
          switch (source.charAt(this.start + 1)) {
            case 'a':
              return this.checkKeyboard(source, 2, 3, 'lse', TokenType.FALSE);
            case 'o':
              return this.checkKeyboard(source, 2, 1, 'r', TokenType.FOR);
            case 'u':
              return this.checkKeyboard(source, 2, 1, 'n', TokenType.FUN);
          }
        }
        break;
      case 't':
        if (this.current - this.start > 1) {
          switch (source.charAt(this.start + 1)) {
            case 'h':
              return this.checkKeyboard(source, 2, 2, 'is', TokenType.THIS);
            case 'r':
              return this.checkKeyboard(source, 2, 2, 'ue', TokenType.TRUE);
          }
        }
        break;
    }

    return TokenType.IDENTIFIER;
  }

  // TODO: length is not needed
  private checkKeyboard(
    source: string,
    start: number,
    length: number,
    rest: string,
    type: NormalTokenType
  ): NormalTokenType {
    if (
      this.current - this.start === start + length &&
      source.substring(this.start + start, this.start + start + length) === rest
    ) {
      return type;
    }

    return TokenType.IDENTIFIER;
  }
}
