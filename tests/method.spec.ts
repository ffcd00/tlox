import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test methods', () => {
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

  test('arity', () => {
    // arrange
    const source = `
      class Foo {
        method0() { return "no args"; }
        method1(a) { return a; }
        method2(a, b) { return a + b; }
        method3(a, b, c) { return a + b + c; }
        method4(a, b, c, d) { return a + b + c + d; }
        method5(a, b, c, d, e) { return a + b + c + d + e; }
        method6(a, b, c, d, e, f) { return a + b + c + d + e + f; }
        method7(a, b, c, d, e, f, g) { return a + b + c + d + e + f + g; }
        method8(a, b, c, d, e, f, g, h) { return a + b + c + d + e + f + g + h; }
      }
      
      var foo = Foo();
      print foo.method0(); // expect: no args
      print foo.method1(1); // expect: 1
      print foo.method2(1, 2); // expect: 3
      print foo.method3(1, 2, 3); // expect: 6
      print foo.method4(1, 2, 3, 4); // expect: 10
      print foo.method5(1, 2, 3, 4, 5); // expect: 15
      print foo.method6(1, 2, 3, 4, 5, 6); // expect: 21
      print foo.method7(1, 2, 3, 4, 5, 6, 7); // expect: 28
      print foo.method8(1, 2, 3, 4, 5, 6, 7, 8); // expect: 36
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'no args');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '3');
    expect(stdout).toHaveBeenNthCalledWith(7, '6');
    expect(stdout).toHaveBeenNthCalledWith(9, '10');
    expect(stdout).toHaveBeenNthCalledWith(1, '15');
    expect(stdout).toHaveBeenNthCalledWith(1, '21');
    expect(stdout).toHaveBeenNthCalledWith(1, '28');
    expect(stdout).toHaveBeenNthCalledWith(1, '36');
  });

  test('empty block', () => {
    // arrange
    const source = `
      class Foo {
        bar() {}
      }
      
      print Foo().bar(); // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'nil');
  });

  test('extra arguments', () => {
    // arrange
    const source = `
      class Foo {
        method(a, b) {
          print a;
          print b;
        }
      }
      
      Foo().method(1, 2, 3, 4); // expect runtime error: Expected 2 arguments but got 4.
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

  test('missing arguments', () => {
    // arrange
    const source = `
      class Foo {
        method(a, b) {}
      }
      
      Foo().method(1); // expect runtime error: Expected 2 arguments but got 1.
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

  test('not found', () => {
    // arrange
    const source = `
      class Foo {}

      Foo().unknown(); // expect runtime error: Undefined property 'unknown'.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined property 'unknown'"
    );
  });

  test('print bound method', () => {
    // arrange
    const source = `
      class Foo {
        method() { }
      }
      var foo = Foo();
      print foo.method; // expect: <fn method>
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '<fn method>');
  });

  test('refer to name', () => {
    // arrange
    const source = `
      class Foo {
        method() {
          print method; // expect runtime error: Undefined variable 'method'.
        }
      }
      
      Foo().method();
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined property 'method'"
    );
  });
});
