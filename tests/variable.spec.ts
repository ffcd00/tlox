import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test global variables', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
  });

  beforeEach(() => {
    stdout.mockClear();
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
});
