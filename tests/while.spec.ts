import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test while', () => {
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stderr = jest.spyOn(Environment.prototype, 'stderr');
  });

  beforeEach(() => {
    stdout.mockClear();
    stderr.mockClear();
  });

  test('class in body', () => {
    // arrange
    const source = `
      // [line 2] Error at 'class': Expect expression.
      while (true) class Foo {}
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
    // TODO: restore when closure is ready
    // // arrange
    // const source = `
    //   var f1;
    //   var f2;
    //   var f3;
    //   var i = 1;
    //   while (i < 4) {
    //     var j = i;
    //     fun f() { print j; }
    //     if (j == 1) f1 = f;
    //     else if (j == 2) f2 = f;
    //     else f3 = f;
    //     i = i + 1;
    //   }
    //   f1(); // expect: 1
    //   f2(); // expect: 2
    //   f3(); // expect: 3
    // `;
    // // act
    // const result = interpret(source);
    // // assert
    // expect(result).toEqual(InterpretResult.OK);
    // expect(stdout).toHaveBeenNthCalledWith(1, '1');
    // expect(stdout).toHaveBeenNthCalledWith(3, '2');
    // expect(stdout).toHaveBeenNthCalledWith(5, '3');
  });

  test('fun in body', () => {
    // arrange
    const source = `
      // [line 2] Error at 'fun': Expect expression.
      while (true) fun foo() {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'fun': Expect expression"
    );
  });

  test('return closure', () => {
    // TODO: restore when closure is ready
    // // arrange
    // const source = `
    //   fun f() {
    //     while (true) {
    //       var i = "i";
    //       fun g() { print i; }
    //       return g;
    //     }
    //   }
    //   var h = f();
    //   h(); // expect: i
    // `;
    // // act
    // const result = interpret(source);
    // // assert
    // expect(result).toEqual(InterpretResult.OK);
    // expect(stdout).toHaveBeenNthCalledWith(1, 'i');
  });

  test('return inside', () => {
    // TODO: restore when functions are ready
    // // arrange
    // const source = `
    //   fun f() {
    //     while (true) {
    //       var i = "i";
    //       fun g() { print i; }
    //       return g;
    //     }
    //   }
    //   var h = f();
    //   h(); // expect: i
    // `;
    // // act
    // const result = interpret(source);
    // // assert
    // expect(result).toEqual(InterpretResult.OK);
    // expect(stdout).toHaveBeenNthCalledWith(1, 'i');
  });

  test('var in body', () => {
    // arrange
    const source = `
      // [line 2] Error at 'var': Expect expression.
      while (true) var foo;
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
      var c = 0;
      while (c < 3) print c = c + 1;
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
      var a = 0;
      while (a < 3) {
        print a;
        a = a + 1;
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

  test('syntax: statement bodies.', () => {
    // arrange
    const source = `
      // Statement bodies.
      while (false) if (true) 1; else 2;
      while (false) while (true) 1;
      while (false) for (;;) 1;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenCalledTimes(0);
  });
});
