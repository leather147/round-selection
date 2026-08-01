# CI validation

- pnpm install: 1
- typecheck: 99
- tests: 99
- production builds: 99

Exit code 0 means success. Exit code 99 means the step was skipped because dependency installation failed.

Full command output is stored in `.ci-validation.log` when validation is not fully successful.
