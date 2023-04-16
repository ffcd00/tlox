import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test function', () => {
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
  });

  test('body must be block', () => {
    // arrange
    const source = `
      // [line 3] Error at '123': Expect '{' before function body.
      // [c line 4] Error at end: Expect '}' after block.
      fun f() 123;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at '123': Expect '{' before function body"
    );
    expect(stderr).toHaveBeenNthCalledWith(
      3,
      "[line 5] Error at end: Expect '}' after block."
    );
  });

  test('empty body', () => {
    // arrange
    const source = `
      fun f() {}
      print f(); // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'nil');
  });

  test('body must be block', () => {
    // arrange
    const source = `
      fun f(a, b) {
        print a;
        print b;
      }
      
      f(1, 2, 3, 4); // expect runtime error: Expected 2 arguments but got 4.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Expect 2 arguments but got 4'
    );
  });

  test('local mutual recursion', () => {
    // arrange
    const source = `
      {
        fun isEven(n) {
          if (n == 0) return true;
          return isOdd(n - 1); // expect runtime error: Undefined variable 'isOdd'.
        }
      
        fun isOdd(n) {
          if (n == 0) return false;
          return isEven(n - 1);
        }
      
        isEven(4);
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined variable 'isOdd'"
    );
  });

  test('local recursion', () => {
    // TODO: closure
    // arrange
    // const source = `
    //   {
    //     fun fib(n) {
    //       if (n < 2) return n;
    //       return fib(n - 1) + fib(n - 2);
    //     }
    //     print fib(8); // expect: 21
    //   }
    // `;
    // // act
    // const result = interpret(source);
    // // assert
    // expect(result).toEqual(InterpretResult.OK);
    // expect(stdout).toHaveBeenNthCalledWith(1, '21');
  });

  test('missing arguments', () => {
    // arrange
    const source = `
      fun f(a, b) {}

      f(1); // expect runtime error: Expected 2 arguments but got 1.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Expect 2 arguments but got 1'
    );
  });

  test('missing comma in parameters', () => {
    // arrange
    const source = `
      // [line 3] Error at 'c': Expect ')' after parameters.
      // [c line 4] Error at end: Expect '}' after block.
      fun foo(a, b c, d, e, f) {}
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at 'c': Expect ')' after parameters"
    );
    expect(stderr).toHaveBeenNthCalledWith(
      3,
      "[line 5] Error at end: Expect '}' after block."
    );
  });

  test('mutual recursion', () => {
    // arrange
    const source = `
      fun isEven(n) {
        if (n == 0) return true;
        return isOdd(n - 1);
      }
      
      fun isOdd(n) {
        if (n == 0) return false;
        return isEven(n - 1);
      }
      
      print isEven(4); // expect: true
      print isOdd(3); // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
  });

  test('nested call with arguments', () => {
    // arrange
    const source = `
      fun returnArg(arg) {
        return arg;
      }
      
      fun returnFunCallWithArg(func, arg) {
        return returnArg(func)(arg);
      }
      
      fun printArg(arg) {
        print arg;
      }
      
      returnFunCallWithArg(printArg, "hello world"); // expect: hello world
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'hello world');
  });

  test('parameters', () => {
    // arrange
    const source = `
      fun f0() { return 0; }
      print f0(); // expect: 0
      
      fun f1(a) { return a; }
      print f1(1); // expect: 1
      
      fun f2(a, b) { return a + b; }
      print f2(1, 2); // expect: 3
      
      fun f3(a, b, c) { return a + b + c; }
      print f3(1, 2, 3); // expect: 6
      
      fun f4(a, b, c, d) { return a + b + c + d; }
      print f4(1, 2, 3, 4); // expect: 10
      
      fun f5(a, b, c, d, e) { return a + b + c + d + e; }
      print f5(1, 2, 3, 4, 5); // expect: 15
      
      fun f6(a, b, c, d, e, f) { return a + b + c + d + e + f; }
      print f6(1, 2, 3, 4, 5, 6); // expect: 21
      
      fun f7(a, b, c, d, e, f, g) { return a + b + c + d + e + f + g; }
      print f7(1, 2, 3, 4, 5, 6, 7); // expect: 28
      
      fun f8(a, b, c, d, e, f, g, h) { return a + b + c + d + e + f + g + h; }
      print f8(1, 2, 3, 4, 5, 6, 7, 8); // expect: 36
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '3');
    expect(stdout).toHaveBeenNthCalledWith(7, '6');
    expect(stdout).toHaveBeenNthCalledWith(9, '10');
    expect(stdout).toHaveBeenNthCalledWith(11, '15');
    expect(stdout).toHaveBeenNthCalledWith(13, '21');
    expect(stdout).toHaveBeenNthCalledWith(15, '28');
    expect(stdout).toHaveBeenNthCalledWith(17, '36');
  });

  test('print', () => {
    // TODO: native function
    // arrange
    const source = `
      fun foo() {}
      print foo; // expect: <fn foo>
      
      // print clock; // expect: <native fn>
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '<fn foo>');
    // expect(stdout).toHaveBeenNthCalledWith(3, '<native fn>');
  });

  test('recursion', () => {
    // arrange
    const source = `
      fun fib(n) {
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
      }
      
      print fib(8); // expect: 21
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '21');
  });
});
