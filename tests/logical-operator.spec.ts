import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test logical operator', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stdout.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('and: return the first non-true argument', () => {
    // arrange
    const source = `
      // Return the first non-true argument.
      print false and 1; // expect: false
      print true and 1; // expect: 1
      print 1 and 2 and false; // expect: false
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, 'false');
  });

  test('and: return the last argument if all are true', () => {
    // arrange
    const source = `
      // Return the last argument if all are true.
      print 1 and true; // expect: true
      print 1 and 2 and 3; // expect: 3
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, '3');
  });

  test('and: short-circuit at the first false argument', () => {
    // arrange
    const source = `
      // Short-circuit at the first false argument.
      var a = "before";
      var b = "before";
      (a = true) and
          (b = false) and
          (a = "bad");
      print a; // expect: true
      print b; // expect: false
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, 'false');
  });

  test('and: false and nil are false', () => {
    // arrange
    const source = `
      // False and nil are false.
      print false and "bad"; // expect: false
      print nil and "bad"; // expect: nil
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'nil');
  });

  test('and: everything else is true', () => {
    // arrange
    const source = `
      // Everything else is true.
      print true and "ok"; // expect: ok
      print 0 and "ok"; // expect: ok
      print "" and "ok"; // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
    expect(stdout).toHaveBeenNthCalledWith(3, 'ok');
    expect(stdout).toHaveBeenNthCalledWith(5, 'ok');
  });

  test('or: return the first true argument', () => {
    // arrange
    const source = `
      // Return the first true argument.
      print 1 or true; // expect: 1
      print false or 1; // expect: 1
      print false or false or true; // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '1');
    expect(stdout).toHaveBeenNthCalledWith(3, '1');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
  });

  test('or: return the last argument if all are false', () => {
    // arrange
    const source = `
      // Return the last argument if all are false.
      print false or false; // expect: false
      print false or false or false; // expect: false
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'false');
  });

  test('or: short-circuit at the first true argument', () => {
    // arrange
    const source = `
      // Short-circuit at the first true argument.
      var a = "before";
      var b = "before";
      (a = false) or
          (b = true) or
          (a = "bad");
      print a; // expect: false
      print b; // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
  });

  test('or: false and nil are false', () => {
    // arrange
    const source = `
      // False and nil are false.
      print false or "ok"; // expect: ok
      print nil or "ok"; // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
    expect(stdout).toHaveBeenNthCalledWith(3, 'ok');
  });

  test('or: everything else is true', () => {
    // arrange
    const source = `
      // Everything else is true.
      print true or "ok"; // expect: true
      print 0 or "ok"; // expect: 0
      print "s" or "ok"; // expect: s
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, '0');
    expect(stdout).toHaveBeenNthCalledWith(5, 's');
  });
});
