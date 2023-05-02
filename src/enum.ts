export enum OpCode {
  OP_CONSTANT,
  OP_NIL,
  OP_TRUE,
  OP_FALSE,
  OP_POP,
  OP_GET_LOCAL,
  OP_SET_LOCAL,
  OP_GET_GLOBAL,
  OP_DEFINE_GLOBAL,
  OP_SET_GLOBAL,
  OP_GET_UPVALUE,
  OP_SET_UPVALUE,
  OP_EQUAL,
  OP_GREATER,
  OP_LESS,
  OP_ADD,
  OP_SUBTRACT,
  OP_MULTIPLY,
  OP_DIVIDE,
  OP_NOT,
  OP_NEGATE,
  OP_PRINT,
  OP_JUMP,
  OP_JUMP_IF_FALSE,
  OP_LOOP,
  OP_CALL,
  OP_CLOSURE,
  OP_CLOSE_UPVALUE,
  OP_RETURN,
}

export enum TokenType {
  // Single-character tokens
  LEFT_PAREN,
  RIGHT_PAREN,
  LEFT_BRACE,
  RIGHT_BRACE,
  COMMA,
  DOT,
  MINUS,
  PLUS,
  SEMICOLON,
  SLASH,
  STAR,
  // One or two character tokens
  BANG,
  BANG_EQUAL,
  EQUAL,
  EQUAL_EQUAL,
  GREATER,
  GREATER_EQUAL,
  LESS,
  LESS_EQUAL,
  // Literals
  IDENTIFIER,
  STRING,
  NUMBER,
  // Keywords
  AND,
  CLASS,
  ELSE,
  FALSE,
  FOR,
  FUN,
  IF,
  NIL,
  OR,
  PRINT,
  RETURN,
  SUPER,
  THIS,
  TRUE,
  VAR,
  WHILE,
  // others
  ERROR,
  EOF,
}

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

export enum InterpretResult {
  OK,
  COMPILE_ERROR,
  RUNTIME_ERROR,
}

export enum ValueType {
  BOOLEAN,
  NIL,
  NUMBER,
  OBJECT,
}

export enum FunctionType {
  FUNCTION,
  SCRIPT,
}

export enum ObjectType {
  CLOSURE,
  FUNCTION,
  STRING,
  UPVALUE,
}
