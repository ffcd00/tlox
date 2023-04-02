import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test expressions', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('evaluate', () => {
    // arrange
    const source = `
      // Note: This is just for the expression evaluating chapter which evaluates an
      // expression directly.
      print (5 - (3 - 1)) + -1; // expect: 2
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, '2');
  });
});
