import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test return', () => {
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

  test('after else', () => {
    // arrange
    const source = `
      fun f() {
        if (false) "no"; else return "ok";
      }
      
      print f(); // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('after if', () => {
    // arrange
    const source = `
      fun f() {
        if (true) return "ok";
      }
      
      print f(); // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('after while', () => {
    // arrange
    const source = `
      fun f() {
        while (true) return "ok";
      }
      
      print f(); // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('at top level', () => {
    // arrange
    const source = `
      return "wat"; // Error at 'return': Can't return from top-level code.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 2] Error at 'return': Can't return from top-level code"
    );
  });

  test('in function', () => {
    // arrange
    const source = `
      fun f() {
        return "ok";
        print "bad";
      }
      
      print f(); // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('in method', () => {
    // arrange
    const source = `
      class Foo {
        method() {
          return "ok";
          print "bad";
        }
      }
      print Foo().method(); // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('return nil if no value', () => {
    // arrange
    const source = `
      fun f() {
        return;
        print "bad";
      }
      
      print f(); // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'nil');
  });
});
