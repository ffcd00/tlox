import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test precedence', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stdout.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('* has higher precedence than +', () => {
    // arrange
    const source = 'print 2 + 3 * 4;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '14');
  });

  test('* has higher precedence than -', () => {
    // arrange
    const source = 'print 20 - 3 * 4;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '8');
  });

  test('/ has higher precedence than +', () => {
    // arrange
    const source = 'print 2 - 6 / 3;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
  });

  test('< has higher precedence than ==', () => {
    // arrange
    const source = 'print false == 2 < 1;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
  });

  test('> has higher precedence than ==', () => {
    // arrange
    const source = 'print false == 1 > 2;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
  });

  test('<= has higher precedence than ==', () => {
    // arrange
    const source = 'print false == 2 <= 1;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
  });

  test('>= has higher precedence than ==', () => {
    // arrange
    const source = 'print false == 1 >= 2;';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
  });

  test('1 - 1 is not space-sensitive', () => {
    // arrange
    const source = `
      print 1 - 1;
      print 1 -1;
      print 1- 1;
      print 1-1;
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '0');
    expect(stdout).toHaveBeenNthCalledWith(2, '\n');
    expect(stdout).toHaveBeenNthCalledWith(3, '0');
    expect(stdout).toHaveBeenNthCalledWith(4, '\n');
    expect(stdout).toHaveBeenNthCalledWith(5, '0');
    expect(stdout).toHaveBeenNthCalledWith(6, '\n');
    expect(stdout).toHaveBeenNthCalledWith(7, '0');
    expect(stdout).toHaveBeenNthCalledWith(8, '\n');
  });

  test('Using () for grouping', () => {
    // arrange
    const source = 'print (2 * (6 - (2 + 2)));';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '4');
  });
});
