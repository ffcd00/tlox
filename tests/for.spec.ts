import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test for', () => {
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stderr = jest.spyOn(Environment.prototype, 'stderr');
    stdout.mockImplementation(jest.fn());
    stderr.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stdout.mockClear();
    stderr.mockClear();
  });

  test('class in body', () => {
    // arrange
    const source = `
      // [line 2] Error at 'class': Expect expression.
      for (;;) class Foo {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'class': Expect expression"
    );
  });

  test('closure in body', () => {
    // arrange
    const source = `
      var f1;
      var f2;
      var f3;
      for (var i = 1; i < 4; i = i + 1) {
        var j = i;
        fun f() {
          print i;
          print j;
        }
        if (j == 1) f1 = f;
        else if (j == 2) f2 = f;
        else f3 = f;
      }
      f1(); // expect: 1
            // expect: 1
      f2(); // expect: 2
            // expect: 2
      f3(); // expect: 3
            // expect: 3
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '1');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '2');
    expect(stdout).toHaveBeenNthCalledWith(7, '2');
    expect(stdout).toHaveBeenNthCalledWith(9, '3');
    expect(stdout).toHaveBeenNthCalledWith(11, '3');
  });

  test('scope', () => {
    // arrange
    const source = `
      {
        var i = "before";
      
        // New variable is in inner scope.
        for (var i = 0; i < 1; i = i + 1) {
          print i; // expect: 0
      
          // Loop body is in second inner scope.
          var i = -1;
          print i; // expect: -1
        }
      }
      
      {
        // New variable shadows outer variable.
        for (var i = 0; i > 0; i = i + 1) {}
      
        // Goes out of scope after loop.
        var i = "after";
        print i; // expect: after
      
        // Can reuse an existing variable.
        for (i = 0; i < 1; i = i + 1) {
          print i; // expect: 0
        }
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '-1');
    expect(stdout).toHaveBeenNthCalledWith(5, 'after');
    expect(stdout).toHaveBeenNthCalledWith(7, '0');
  });

  test('statement condition', () => {
    // arrange
    const source = `
      // [line 3] Error at '{': Expect expression.
      // [line 3] Error at ')': Expect ';' after expression.
      for (var a = 1; {}; a = a + 1) {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at '{': Expect expression"
    );
    expect(stderr).toHaveBeenNthCalledWith(
      3,
      "[line 4] Error at ')': Expect ';' after expression"
    );
  });

  test('statement increment', () => {
    // arrange
    const source = `
      // [line 3] Error at '{': Expect expression
      for (var a = 1; a < 2; {}) {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at '{': Expect expression"
    );
  });

  test('statement initializer', () => {
    // arrange
    const source = `
      // [line 3] Error at '{': Expect expression.
      // [line 3] Error at ')': Expect ';' after expression.
      for ({}; a < 2; a = a + 1) {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at '{': Expect expression"
    );
    expect(stderr).toHaveBeenNthCalledWith(
      3,
      "[line 4] Error at ')': Expect ';' after expression"
    );
  });

  test('var in body', () => {
    // arrange
    const source = `
      // [line 2] Error at 'var': Expect expression.
      for (;;) var foo;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'var': Expect expression"
    );
  });

  test('syntax: single-expression body', () => {
    // arrange
    const source = `
      // Single-expression body.
      for (var c = 0; c < 3;) print c = c + 1;
      // expect: 1
      // expect: 2
      // expect: 3
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '1');
    expect(stdout).toHaveBeenNthCalledWith(3, '2');
    expect(stdout).toHaveBeenNthCalledWith(5, '3');
  });

  test('syntax: block body', () => {
    // arrange
    const source = `
      // Block body.
      for (var a = 0; a < 3; a = a + 1) {
        print a;
      }
      // expect: 0
      // expect: 1
      // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '2');
  });

  test('syntax: no clause', () => {
    // arrange
    const source = `
      // No clauses.
      fun foo() {
        for (;;) return "done";
      }
      print foo(); // expect: done
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'done');
  });

  test('syntax: no variable', () => {
    // arrange
    const source = `
      // No variable.
      var i = 0;
      for (; i < 2; i = i + 1) print i;
      // expect: 0
      // expect: 1
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
  });

  test('syntax: no condition', () => {
    // arrange
    const source = `
      // No condition.
      fun bar() {
        for (var i = 0;; i = i + 1) {
          print i;
          if (i >= 2) return;
        }
      }
      bar();
      // expect: 0
      // expect: 1
      // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '2');
  });

  test('syntax: no increment', () => {
    // arrange
    const source = `
      // No increment.
      for (var i = 0; i < 2;) {
        print i;
        i = i + 1;
      }
      // expect: 0
      // expect: 1
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
  });

  test('syntax: statement bodies', () => {
    // arrange
    const source = `
      // Statement bodies.
      for (; false;) if (true) 1; else 2;
      for (; false;) while (true) 1;
      for (; false;) for (;;) 1;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenCalledTimes(0);
  });
});
