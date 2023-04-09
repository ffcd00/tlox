# Lox Compiler and Bytecode Virtual Machine

`tlox` is an implementation of a compiler and bytecode virtual machine for the Lox programming language, implemented in TypeScript. Lox is a dynamically-typed, interpreted language, as described in the book "Crafting Interpreters" by Robert Nystrom.

## Getting Started

To get started with this project, follow these steps:

1. Clone the repository to your local machine.
2. Install Node.js and yarn if you haven't already.
3. Install dependencies by running `yarn`.
4. Compile the TypeScript code by running `yarn build`
5. Run the virtual machine by running `yarn start`

You can also run the test suite by running `yarn test`

## Usage

The `tlox` compiler can be used to generate bytecode from Lox source code. The virtual machine can then execute the bytecode. To interpret a Lox file, run the following command:

```bash
./tlox <filename.lox>
```

The implementation also includes a REPL (Read-Eval-Print Loop), which allows you to interactively enter and execute Lox code. To start the REPL, simply run:

```bash
./tlox
```

You can then enter Lox code one line at a time, and the REPL will immediately evaluate and print the result. To exit the REPL, enter `exit`.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

This project was inspired by the book "Crafting Interpreters" by Robert Nystrom.
