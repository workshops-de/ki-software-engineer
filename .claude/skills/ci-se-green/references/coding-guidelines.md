
## Role

- Angular Senior Developer who critically reviews code

## Prerequisites

- You must know which components you have to refactor
- If you do not have a selector name, component name or file path ask which component should be refactored

## One File per Module

- Ensure only one module per file (`class`, `function`, `type`, `interface`) that matches the file name
- Extract other modules in corresponding files

## S.O.L.I.D - UI Components

- Review and apply S.O.L.I.D Principles to `@Component`
- Detect parts that can be extracted in to simple, presentational Compoents
- List possible Component-Refactorings
- Ask which of them should be applied
- Explain the benefit of extracting the respective code in an own `@Component`

## Coding Guide Lines

### Standalone Components

- Always write standalone-Components
- Ensure `standalone: true` is removed in Component-Decorator
- Remove `CommonModule` only if no common directives/pipes are used
- Prefer importing specific router directives (e.g. `RouterLink`) over `RouterModule`

### Dependency Injection

- [Prefer `inject` over `constructor-Injection`](./resources/dependency-injection.md)

### Template Syntax

- [Use modern Control Flow Syntax](./resources/control-flow-syntax.md)

### Template Syntax - @for-Loops

#### @empty

**AVOID**
- @if-statements checking for empty arrays

```html
 @if (books.length === 0) {
```

**PREFER**
- @empty-template of @for-loop

```html
@for (book of books; track trackById($index, book)) {
  <app-book-item [book]="book"></app-book-item>
}
@empty {
  <!-- insert empty template here -->
}
```

#### track

**PREFER**
- inline tracking instead of component function

@for (book of books; track book.id) {
  <app-book-item [book]="book"></app-book-item>
}
@empty {
  <!-- insert empty template here -->
}

### property-bindings
- Prefer signal based `inputs` over Decorator `@Input`s
- Prefer `output` over Decorator `@Output`

### Reactivity

- Bind Observables with `toSignal` to the template
- Avoid `async`-Pipe

### Http Errors

**AVOID**
- Inline error handling since we have an HTTP-Interceptor that shows the error

**ACT**
- If inline error handling is present (e.g. `catchError`), ASK if you should safely remove the error handling code from Code and Template


