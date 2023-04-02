import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test empty file', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('empty', () => {
    // arrange
    const source = '';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
  });
});
