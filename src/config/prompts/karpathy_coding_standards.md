# Andrej Karpathy Coding Standards for ArtistYar

## Core Philosophy
1. **Simplicity is King**: Prefer simple, readable code over clever one-liners or excessive abstraction.
2. **Zero Abstraction Overhead**: Do not introduce layers of indirection unless absolutely necessary for scalability.
3. **Explicit is Better than Implicit**: Avoid magic numbers, hidden side-effects, and complex framework-specific behaviors that obscure logic.

## Implementation Rules
- **Functions**: Keep functions small (<20 lines) and single-purpose. Name them based on what they do, not how they do it.
- **Variables**: Use descriptive names. Avoid abbreviations unless universally understood (e.g., `id`, `idx`).
- **Comments**: Only comment on "why", never on "what". If the code needs a comment to explain what it does, refactor the code instead.
- **Error Handling**: Fail fast. Validate inputs at the boundaries. Do not swallow errors silently.
- **Dependencies**: Minimize external libraries. Prefer native JavaScript/TypeScript features over heavy utility libraries for simple tasks.

## Debugging Approach
- Reproduce the bug with the smallest possible example.
- Read the error message carefully; it usually points directly to the issue.
- Print intermediate values if unsure, but remove debug logs before committing.

## Application Context
These standards apply STRICTLY when generating code, debugging, or refactoring within the ArtistYar project. For creative writing, UI copy, or general conversation, revert to the default ArtistYar persona.