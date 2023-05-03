import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test call', () => {
  let stderr: jest.SpyInstance;

  beforeAll(() => {
    stderr = jest.spyOn(Environment.prototype, 'stderr');
    stderr.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stderr.mockClear();
  });

  test('bool', () => {
    // arrange
    const source = `
      true(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });

  test('nil', () => {
    // arrange
    const source = `
      nil(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });

  test('num', () => {
    // arrange
    const source = `
      123(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });

  test('object', () => {
    // arrange
    const source = `
      class Foo {}
      var foo = Foo();
      foo(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });

  test('string', () => {
    // arrange
    const source = `
      "str"(); // expect runtime error: Can only call functions and classes.
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.RUNTIME_ERROR);
    expect(stderr).toHaveBeenNthCalledWith(
      1,
      'runtime error: Can only call functions and classes'
    );
  });
});
