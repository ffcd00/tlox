import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test number', () => {
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

  describe('literals', () => {
    test('integer literal', () => {
      // arrange
      const source = `
        print 123;     // expect: 123
        print 987654;  // expect: 987654
        print 0;       // expect: 0
        print -0;      // expect: -0
      `;

      // act
      const result = interpret(source);

      // assert
      expect(result).toEqual(InterpretResult.OK);
      expect(stdout).toHaveBeenNthCalledWith(1, '123');
      expect(stdout).toHaveBeenNthCalledWith(3, '987654');
      expect(stdout).toHaveBeenNthCalledWith(5, '0');
      expect(stdout).toHaveBeenNthCalledWith(7, '-0');
    });

    test('float literal', () => {
      // arrange
      const source = `
        print 123.456; // expect: 123.456
        print -0.001;  // expect: -0.001
      `;

      // act
      const result = interpret(source);

      // assert
      expect(result).toEqual(InterpretResult.OK);
      expect(stdout).toHaveBeenNthCalledWith(1, '123.456');
      expect(stdout).toHaveBeenNthCalledWith(3, '-0.001');
    });
  });

  describe('NaN equality', () => {
    test('NaN is not equal to anything', () => {
      // arrange
      const source = `
        var nan = 0/0;

        print nan == 0; // expect: false
        print nan != 1; // expect: true
      `;

      // act
      const result = interpret(source);

      // assert
      expect(result).toEqual(InterpretResult.OK);
      expect(stdout).toHaveBeenNthCalledWith(1, 'false');
      expect(stdout).toHaveBeenNthCalledWith(3, 'true');
    });
  });

  test('NaN is not equal to self', () => {
    // arrange
    const source = `
      var nan = 0/0;

      print nan == nan; // expect: false
      print nan != nan; // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
  });

  describe('decimal point', () => {
    test('decimal point at EOF', () => {
      // arrange
      const source = `
        // [line 2] Error at end: Expect property name after '.'.
        123.
      `;

      // act
      const result = interpret(source);

      // assert
      expect(result).toEqual(InterpretResult.COMPILE_ERROR);
      // TODO: restore after classes are ready
      // expect(stderr).toHaveBeenNthCalledWith(
      //   1,
      //   "[line 2] Error at end: Expect property name after '.'"
      // );
    });
  });

  test('leading dot', () => {
    // arrange
    const source = `
      // [line 2] Error at '.': Expect expression.
      .123;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      "[line 3] Error at '.': Expect expression"
    );
  });

  test('trailing dot', () => {
    // arrange
    const source = `
      // [line 2] Error at ';': Expect property name after '.'.
      123.;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.COMPILE_ERROR);
    // TODO: restore after classes are ready
    // expect(stderr).toHaveBeenNthCalledWith(
    //   1,
    //   "[line 2] Error at ';': Expect property name after '.'"
    // );
  });
});
