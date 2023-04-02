import { interpret } from '../src';
import { InterpretResult } from '../src/enum';
import { Environment } from '../src/environment';

describe('test boolean', () => {
  let stdout: jest.SpyInstance;

  beforeAll(() => {
    stdout = jest.spyOn(Environment.prototype, 'stdout');
  });

  beforeEach(() => {
    stdout.mockClear();
  });

  test('boolean comparison 1', () => {
    // arrange
    const source = `
      print true == true;    // expect: true
      print true == false;   // expect: false
      print false == true;   // expect: false
      print false == false;  // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, 'false');
    expect(stdout).toHaveBeenNthCalledWith(5, 'false');
    expect(stdout).toHaveBeenNthCalledWith(7, 'true');
  });

  test('boolean comparison 2', () => {
    // arrange
    const source = `
      print true != true;    // expect: false
      print true != false;   // expect: true
      print false != true;   // expect: true
      print false != false;  // expect: false
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
    expect(stdout).toHaveBeenNthCalledWith(7, 'false');
  });

  test('not equal to other types 1', () => {
    // arrange
    const source = `
      print true == 1;        // expect: false
      print false == 0;       // expect: false
      print true == "true";   // expect: false
      print false == "false"; // expect: false
      print false == "";      // expect: false
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'false');
    expect(stdout).toHaveBeenNthCalledWith(5, 'false');
    expect(stdout).toHaveBeenNthCalledWith(7, 'false');
    expect(stdout).toHaveBeenNthCalledWith(9, 'false');
  });

  test('not equal to other types 2', () => {
    // arrange
    const source = `
      print true != 1;        // expect: true
      print false != 0;       // expect: true
      print true != "true";   // expect: true
      print false != "false"; // expect: true
      print false != "";      // expect: true
    `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'true');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
    expect(stdout).toHaveBeenNthCalledWith(7, 'true');
    expect(stdout).toHaveBeenNthCalledWith(9, 'true');
  });

  test('not operator', () => {
    // arrange
    const source = `
      print !true;    // expect: false
      print !false;   // expect: true
      print !!true;   // expect: true
   `;

    // act
    const result = interpret(source);

    // assert
    expect(result).toEqual(InterpretResult.OK);
    expect(stdout).toHaveBeenNthCalledWith(1, 'false');
    expect(stdout).toHaveBeenNthCalledWith(3, 'true');
    expect(stdout).toHaveBeenNthCalledWith(5, 'true');
  });
});
