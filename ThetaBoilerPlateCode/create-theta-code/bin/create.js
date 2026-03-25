#!/usr/bin/env node
// bin/create.js — Entry point for create-theta-code CLI. Routes to runCLI orchestrator only.

import { runCLI } from '../src/cli.js';

runCLI(process.argv.slice(2)).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
