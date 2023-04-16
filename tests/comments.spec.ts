import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test comments', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
    stdout.mockImplementation(jest.fn());
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('line at EOF', () => {
    // arrange
    const source = `
      print "ok"; // expect: ok
      // comment
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });

  test('only line comment', () => {
    // arrange
    const source = '// comment';

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
  });

  test('unicode comment', () => {
    // arrange
    const source = `
      // Unicode characters are allowed in comments.
      //
      // Latin 1 Supplement: £§¶ÜÞ
      // Latin Extended-A: ĐĦŋœ
      // Latin Extended-B: ƂƢƩǁ
      // Other stuff: ឃᢆ᯽₪ℜ↩⊗┺░
      // Emoji: ☃☺♣

      print "ok"; // expect: ok
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'ok');
  });
});
