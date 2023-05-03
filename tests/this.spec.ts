import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test this', () => {
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

  test('closure', () => {
    // arrange
    const source = `
      class Foo {
        getClosure() {
          fun closure() {
            return this.toString();
          }
          return closure;
        }
      
        toString() { return "Foo"; }
      }
      
      var closure = Foo().getClosure();
      print closure(); // expect: Foo
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'Foo');
  });

  test('nested class', () => {
    // arrange
    const source = `
      class Outer {
        method() {
          print this; // expect: Outer instance
      
          fun f() {
            print this; // expect: Outer instance
      
            class Inner {
              method() {
                print this; // expect: Inner instance
              }
            }
      
            Inner().method();
          }
          f();
        }
      }
      
      Outer().method();
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'Outer instance');
    expect(stdout).toHaveBeenNthCalledWith(3, 'Outer instance');
    expect(stdout).toHaveBeenNthCalledWith(5, 'Inner instance');
  });

  test('nested closure', () => {
    // arrange
    const source = `
      class Foo {
        getClosure() {
          fun f() {
            fun g() {
              fun h() {
                return this.toString();
              }
              return h;
            }
            return g;
          }
          return f;
        }
      
        toString() { return "Foo"; }
      }
      
      var closure = Foo().getClosure();
      print closure()()(); // expect: Foo
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'Foo');
  });

  test('this at top level', () => {
    // arrange
    const source = `
      this; // Error at 'this': Can't use 'this' outside of a class.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 2] Error at 'this': Can't use 'this' outside of a class"
    );
  });

  test('this in method', () => {
    // arrange
    const source = `
      class Foo {
        bar() { return this; }
        baz() { return "baz"; }
      }
      
      print Foo().bar().baz(); // expect: baz
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'baz');
  });

  test('this in top level function', () => {
    // arrange
    const source = `
      fun foo() {
        this; // Error at 'this': Can't use 'this' outside of a class.
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'this': Can't use 'this' outside of a class"
    );
  });
});
