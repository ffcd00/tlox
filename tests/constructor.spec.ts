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

  test('arguments', () => {
    // arrange
    const source = `
      class Foo {
        init(a, b) {
          print "init"; // expect: init
          this.a = a;
          this.b = b;
        }
      }
      
      var foo = Foo(1, 2);
      print foo.a; // expect: 1
      print foo.b; // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'init');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, '2');
  });

  test('call init early return', () => {
    // arrange
    const source = `
      class Foo {
        init() {
          print "init";
          return;
          print "nope";
        }
      }
      
      var foo = Foo(); // expect: init
      print foo.init(); // expect: init
      // expect: Foo instance
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'init');
    expect(stdout).toHaveBeenNthCalledWith(3, 'init');
    expect(stdout).toHaveBeenNthCalledWith(5, 'Foo instance');
  });

  test('call init explicitly', () => {
    // arrange
    const source = `
      class Foo {
        init(arg) {
          print "Foo.init(" + arg + ")";
          this.field = "init";
        }
      }
      
      var foo = Foo("one"); // expect: Foo.init(one)
      foo.field = "field";
      
      var foo2 = foo.init("two"); // expect: Foo.init(two)
      print foo2; // expect: Foo instance
      
      // Make sure init() doesn't create a fresh instance.
      print foo.field; // expect: init
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'Foo.init(one)');
    expect(stdout).toHaveBeenNthCalledWith(3, 'Foo.init(two)');
    expect(stdout).toHaveBeenNthCalledWith(5, 'Foo instance');
    expect(stdout).toHaveBeenNthCalledWith(7, 'init');
  });

  test('default', () => {
    // arrange
    const source = `
      class Foo {}

      var foo = Foo();
      print foo; // expect: Foo instance
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'Foo instance');
  });

  test('default arguments', () => {
    // arrange
    const source = `
      class Foo {}

      var foo = Foo(1, 2, 3); // expect runtime error: Expected 0 arguments but got 3.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Expected 0 arguments but got 3'
    );
  });

  test('early return', () => {
    // arrange
    const source = `
      class Foo {
        init() {
          print "init";
          return;
          print "nope";
        }
      }
      
      var foo = Foo(); // expect: init
      print foo; // expect: Foo instance
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'init');
    expect(stdout).toHaveBeenNthCalledWith(3, 'Foo instance');
  });

  test('extra arguments', () => {
    // arrange
    const source = `
      class Foo {
        init(a, b) {
          this.a = a;
          this.b = b;
        }
      }
      
      var foo = Foo(1, 2, 3, 4); // expect runtime error: Expected 2 arguments but got 4.
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

  test('init not method', () => {
    // arrange
    const source = `
      class Foo {
        init(arg) {
          print "Foo.init(" + arg + ")";
          this.field = "init";
        }
      }
      
      fun init() {
        print "not initializer";
      }
      
      init(); // expect: not initializer
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'not initializer');
  });

  test('missing arguments', () => {
    // arrange
    const source = `
      class Foo {
        init(a, b) {}
      }
      
      var foo = Foo(1); // expect runtime error: Expected 2 arguments but got 1.
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

  test('return in nested function', () => {
    // arrange
    const source = `
      class Foo {
        init() {
          fun init() {
            return "bar";
          }
          print init(); // expect: bar
        }
      }
      
      print Foo(); // expect: Foo instance
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'bar');
    expect(stdout).toHaveBeenNthCalledWith(3, 'Foo instance');
  });

  test('return value', () => {
    // arrange
    const source = `
      class Foo {
        init() {
          return "result"; // Error at 'return': Can't return a value from an initializer.
        }
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at 'return': Can't return a value from an initializer"
    );
  });
});
