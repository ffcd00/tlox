import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test if', () => {
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

  test('class in else', () => {
    // arrange
    const source = `
      // [line 2] Error at 'class': Expect expression.
      if (true) "ok"; else class Foo {}
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

  test('class in then', () => {
    // arrange
    const source = `
      // [line 2] Error at 'class': Expect expression.
      if (true) class Foo {}
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

  test('dangling else', () => {
    // arrange
    const source = `
      // A dangling else binds to the right-most if.
      if (true) if (false) print "bad"; else print "good"; // expect: good
      if (false) if (true) print "bad"; else print "bad";
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'good');
  });

  test('else', () => {
    // arrange
    const source = `
      // Evaluate the 'else' expression if the condition is false.
      if (true) print "good"; else print "bad"; // expect: good
      if (false) print "bad"; else print "good"; // expect: good
      
      // Allow block body.
      if (false) nil; else { print "block"; } // expect: block
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'good');
    expect(stdout).toHaveBeenNthCalledWith(3, 'good');
    expect(stdout).toHaveBeenNthCalledWith(5, 'block');
  });

  test('fun in else', () => {
    // arrange
    const source = `
      // [line 2] Error at 'fun': Expect expression.
      if (true) "ok"; else fun foo() {}
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

  test('fun in then', () => {
    // arrange
    const source = `
      // [line 3] Error at 'fun': Expect expression.
      if (true) fun foo() {}
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

  test('if', () => {
    // arrange
    const source = `
      // Evaluate the 'then' expression if the condition is true.
      if (true) print "good"; // expect: good
      if (false) print "bad";
      
      // Allow block body.
      if (true) { print "block"; } // expect: block
      
      // Assignment in if condition.
      var a = false;
      if (a = true) print a; // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'good');
    expect(stdout).toHaveBeenNthCalledWith(3, 'block');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
  });

  test('truth', () => {
    // arrange
    const source = `
      // False and nil are false.
      if (false) print "bad"; else print "false"; // expect: false
      if (nil) print "bad"; else print "nil"; // expect: nil
      
      // Everything else is true.
      if (true) print true; // expect: true
      if (0) print 0; // expect: 0
      if ("") print "empty"; // expect: empty
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'nil');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
    expect(stdout).toHaveBeenNthCalledWith(7, '0');
    expect(stdout).toHaveBeenNthCalledWith(9, 'empty');
  });

  test('var in else', () => {
    // arrange
    const source = `
      // [line 2] Error at 'var': Expect expression.
      if (true) "ok"; else var foo;
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

  test('var in then', () => {
    // arrange
    const source = `
      // [line 2] Error at 'var': Expect expression.
      if (true) var foo;
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
});
