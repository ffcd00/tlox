import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test global variables', () => {
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

  test('define global variables', () => {
    // arrange
    const source = `
      var beverage = "cafe au lait";
      var breakfast = "beignets with " + beverage;
      print breakfast;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'beignets with cafe au lait');
  });

  test('global variables assignment', () => {
    // arrange
    const source = `
      var breakfast = "beignets";
      var beverage = "cafe au lait";
      breakfast = "beignets with " + beverage;

      print breakfast;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'beignets with cafe au lait');
  });

  test('redeclare global', () => {
    // arrange
    const source = `
      var a = "1";
      var a;
      print a; // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'nil');
  });

  test('redeclare global', () => {
    // arrange
    const source = `
      var a = "1";
      var a = "2";
      print a; // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '2');
  });

  test('undefined global', () => {
    // arrange
    const source = `
      print notDefined;  // expect runtime error: Undefined variable 'notDefined'.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined variable 'notDefined'"
    );
  });

  test('use global in initializer', () => {
    // arrange
    const source = `
      var a = "value";
      var a = a;
      print a; // expect: value
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'value');
  });

  test('use nil as var', () => {
    // arrange
    const source = `
      // [line 2] Error at 'nil': Expect variable name.
      var nil = "value";
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'nil': Expect variable name"
    );
  });

  test('use this as var', () => {
    // arrange
    const source = `
      // [line 2] Error at 'this': Expect variable name.
      var this = "value";
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'this': Expect variable name"
    );
  });
});

describe('test local variables', () => {
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

  test('duplicate local', () => {
    // arrange
    const source = `
      {
        var a = "value";
        var a = "other"; // Error at 'a': Already a variable with this name in this scope.
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at 'a': Already a variable with this name in this scope."
    );
  });

  test('in middle of block', () => {
    // arrange
    const source = `
      {
        var a = "a";
        print a; // expect: a
        var b = a + " b";
        print b; // expect: a b
        var c = a + " c";
        print c; // expect: a c
        var d = b + " d";
        print d; // expect: a b d
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'a');
    expect(stdout).toHaveBeenNthCalledWith(3, 'a b');
    expect(stdout).toHaveBeenNthCalledWith(5, 'a c');
    expect(stdout).toHaveBeenNthCalledWith(7, 'a b d');
  });

  test('in nested block', () => {
    // arrange
    const source = `
    {
      var a = "outer";
      {
        print a; // expect: outer
      }
    }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'outer');
  });

  test('scope reuse in different blocks', () => {
    // arrange
    const source = `
      {
        var a = "first";
        print a; // expect: first
      }
      
      {
        var a = "second";
        print a; // expect: second
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'first');
    expect(stdout).toHaveBeenNthCalledWith(3, 'second');
  });

  test('shadow and local', () => {
    // arrange
    const source = `
      {
        var a = "outer";
        {
          print a; // expect: outer
          var a = "inner";
          print a; // expect: inner
        }
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'outer');
    expect(stdout).toHaveBeenNthCalledWith(3, 'inner');
  });

  test('shadow global', () => {
    // arrange
    const source = `
      var a = "global";
      {
        var a = "shadow";
        print a; // expect: shadow
      }
      print a; // expect: global
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'shadow');
    expect(stdout).toHaveBeenNthCalledWith(3, 'global');
  });

  test('shadow local', () => {
    // arrange
    const source = `
      {
        var a = "local";
        {
          var a = "shadow";
          print a; // expect: shadow
        }
        print a; // expect: local
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'shadow');
    expect(stdout).toHaveBeenNthCalledWith(3, 'local');
  });

  test('undefined local', () => {
    // arrange
    const source = `
      {
        print notDefined;  // expect runtime error: Undefined variable 'notDefined'.
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "runtime error: Undefined variable 'notDefined'"
    );
  });

  test('uninitialized', () => {
    // arrange
    const source = `
      var a;
      print a; // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'nil');
  });

  test('unreached undefined', () => {
    // arrange
    const source = `
      if (false) {
        print notDefined;
      }
      print "ok"; // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('use false as var', () => {
    // arrange
    const source = `
      // [line 2] Error at 'false': Expect variable name.
      var false = "value";
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at 'false': Expect variable name"
    );
  });

  test('use local in initializer', () => {
    // arrange
    const source = `
      var a = "outer";
      {
        var a = a; // Error at 'a': Can't read local variable in its own initializer.
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 4] Error at 'a': Can't read local variable in its own initializer."
    );
  });
});
