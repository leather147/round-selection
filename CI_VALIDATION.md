# CI validation

- pnpm install: 0
- typecheck: 0
- tests: 2
- production builds: 0

Exit code 0 means success. Exit code 99 means the step was skipped because dependency installation failed.

Full command output is stored in `.ci-validation.log` when validation is not fully successful.
