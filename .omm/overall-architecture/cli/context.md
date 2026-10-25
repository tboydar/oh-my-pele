The binary is `dist/cli.js` with a node shebang. It only calls `runMain` when that file is the process entry, so tests can import the command functions.
