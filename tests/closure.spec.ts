import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test closure', () => {
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stdout.mockImplementation(jest.fn());
    stderr = jest.spyOn(Environment.prototype, 'stderr');
    stderr.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stdout.mockClear();
    stderr.mockClear();
  });

  test('assign to closure', () => {
    // arrange
    const source = `
      var f;
      var g;

      {
        var local = "local";
        fun f_() {
          print local;
          local = "after f";
          print local;
        }
        f = f_;

        fun g_() {
          print local;
          local = "after g";
          print local;
        }
        g = g_;
      }

      f();
      // expect: local
      // expect: after f

      g();
      // expect: after f
      // expect: after g
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'local');
    expect(stdout).toHaveBeenNthCalledWith(3, 'after f');
    expect(stdout).toHaveBeenNthCalledWith(5, 'after f');
    expect(stdout).toHaveBeenNthCalledWith(7, 'after g');
  });

  test('assign to shadowed later', () => {
    // arrange
    const source = `
      var a = "global";

      {
        fun assign() {
          a = "assigned";
        }
      
        var a = "inner";
        assign();
        print a; // expect: inner
      }
      
      print a; // expect: assigned
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'inner');
    expect(stdout).toHaveBeenNthCalledWith(3, 'assigned');
  });

  test('close over function parameter', () => {
    // arrange
    const source = `
      var f;

      fun foo(param) {
        fun f_() {
          print param;
        }
        f = f_;
      }
      foo("param");
      
      f(); // expect: param
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'param');
  });

  test('close over later variable', () => {
    // arrange
    const source = `
      fun f() {
        var a = "a";
        var b = "b";
        fun g() {
          print b; // expect: b
          print a; // expect: a
        }
        g();
      }
      f();
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'b');
    expect(stdout).toHaveBeenNthCalledWith(3, 'a');
  });

  test('close over method parameter', () => {
    // arrange
    const source = `
      var f;
      class Foo {
        method(param) {
          fun f_() {
            print param;
          }
          f = f_;
        }
      }
      Foo().method("param");
      f(); // expect: param
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'param');
  });

  test('close closure in function', () => {
    // arrange
    const source = `
      var f;

      {
        var local = "local";
        fun f_() {
          print local;
        }
        f = f_;
      }
      
      f(); // expect: local
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'local');
  });

  test('nested closure', () => {
    // arrange
    const source = `
      var f;

      fun f1() {
        var a = "a";
        fun f2() {
          var b = "b";
          fun f3() {
            var c = "c";
            fun f4() {
              print a;
              print b;
              print c;
            }
            f = f4;
          }
          f3();
        }
        f2();
      }
      f1();
      
      f();
      // expect: a
      // expect: b
      // expect: c
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'a');
    expect(stdout).toHaveBeenNthCalledWith(3, 'b');
    expect(stdout).toHaveBeenNthCalledWith(5, 'c');
  });

  test('open closure in function', () => {
    // arrange
    const source = `
      {
        var local = "local";
        fun f() {
          print local; // expect: local
        }
        f();
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'local');
  });

  test('reference closure multiple times', () => {
    // arrange
    const source = `
      var f;

      {
        var a = "a";
        fun f_() {
          print a;
          print a;
        }
        f = f_;
      }
      
      f();
      // expect: a
      // expect: a
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'a');
    expect(stdout).toHaveBeenNthCalledWith(3, 'a');
  });

  test('reuse closure slot', () => {
    // arrange
    const source = `
      {
        var f;
      
        {
          var a = "a";
          fun f_() { print a; }
          f = f_;
        }
      
        {
          // Since a is out of scope, the local slot will be reused by b. Make sure
          // that f still closes over a.
          var b = "b";
          f(); // expect: a
        }
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'a');
  });

  test('shadow closure with local', () => {
    // arrange
    const source = `
      {
        var foo = "closure";
        fun f() {
          {
            print foo; // expect: closure
            var foo = "shadow";
            print foo; // expect: shadow
          }
          print foo; // expect: closure
        }
        f();
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'closure');
    expect(stdout).toHaveBeenNthCalledWith(3, 'shadow');
    expect(stdout).toHaveBeenNthCalledWith(5, 'closure');
  });

  test('unused closure', () => {
    // arrange
    const source = `
      {
        var a = "a";
        if (false) {
          fun foo() { a; }
        }
      }
      
      print "ok"; // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('unused later closure', () => {
    // arrange
    const source = `
      var closure;

      {
        var a = "a";
      
        {
          var b = "b";
          fun returnA() {
            return a;
          }
      
          closure = returnA;
      
          if (false) {
            fun returnB() {
              return b;
            }
          }
        }
      
        print closure(); // expect: a
      }
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'a');
  });
});
