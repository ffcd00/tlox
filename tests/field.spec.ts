import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test constructor', () => {
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

  test('call function field', () => {
    // arrange
    const source = `
      class Foo {}

      fun bar(a, b) {
        print "bar";
        print a;
        print b;
      }
      
      var foo = Foo();
      foo.bar = bar;
      
      foo.bar(1, 2);
      // expect: bar
      // expect: 1
      // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'bar');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '2');
  });

  test('call non-function field', () => {
    // arrange
    const source = `
      class Foo {}

      var foo = Foo();
      foo.bar = "not fn";
      
      foo.bar(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });

  test('get and set method', () => {
    // arrange
    const source = `
      // Bound methods have identity equality.
      class Foo {
        method(a) {
          print "method";
          print a;
        }
        other(a) {
          print "other";
          print a;
        }
      }
      
      var foo = Foo();
      var method = foo.method;
      
      // Setting a property shadows the instance method.
      foo.method = foo.other;
      foo.method(1);
      // expect: other
      // expect: 1
      
      // The old method handle still points to the original method.
      method(2);
      // expect: method
      // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'other');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, 'method');
    expect(stdout).toHaveBeenNthCalledWith(7, '2');
  });

  test('get on bool', () => {
    // arrange
    const source = `
      true.foo; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('get on class', () => {
    // arrange
    const source = `
      class Foo {}
      Foo.bar; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('get on function', () => {
    // arrange
    const source = `
      fun foo() {}

      foo.bar; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('get on nil', () => {
    // arrange
    const source = `
      nil.foo; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('get on num', () => {
    // arrange
    const source = `
      123.foo; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('get on string', () => {
    // arrange
    const source = `
      "str".foo; // expect runtime error: Only instances have properties.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have properties'
    );
  });

  test('method', () => {
    // arrange
    const source = `
      class Foo {
        bar(arg) {
          print arg;
        }
      }
      
      var bar = Foo().bar;
      print "got method"; // expect: got method
      bar("arg");          // expect: arg
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'got method');
    expect(stdout).toHaveBeenNthCalledWith(3, 'arg');
  });

  test('on instance', () => {
    // arrange
    const source = `
      class Foo {}

      var foo = Foo();
      
      print foo.bar = "bar value"; // expect: bar value
      print foo.baz = "baz value"; // expect: baz value
      
      print foo.bar; // expect: bar value
      print foo.baz; // expect: baz value
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'bar value');
    expect(stdout).toHaveBeenNthCalledWith(3, 'baz value');
    expect(stdout).toHaveBeenNthCalledWith(5, 'bar value');
    expect(stdout).toHaveBeenNthCalledWith(7, 'baz value');
  });

  test('set evaluation order', () => {
    // arrange
    const source = `
      undefined1.bar // expect runtime error: Undefined variable 'undefined1'.
      = undefined2;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined variable 'undefined1'"
    );
  });

  test('set on bool', () => {
    // arrange
    const source = `
      true.foo = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('set on class', () => {
    // arrange
    const source = `
      class Foo {}
      Foo.bar = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('set on function', () => {
    // arrange
    const source = `
      fun foo() {}

      foo.bar = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('set on nil', () => {
    // arrange
    const source = `
      nil.foo = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('set on num', () => {
    // arrange
    const source = `
      123.foo = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('set on string', () => {
    // arrange
    const source = `
      "str".foo = "value"; // expect runtime error: Only instances have fields.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Only instances have fields'
    );
  });

  test('undefined', () => {
    // arrange
    const source = `
      class Foo {}
      var foo = Foo();
      
      foo.bar; // expect runtime error: Undefined property 'bar'.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined property 'bar'"
    );
  });
});
