---
topics:
  - TypeScript
  - Programming
---

# TypeScript Best Practices

TypeScript has become the de facto standard for building large-scale
JavaScript applications. Here are some best practices I've learned along
the way.

## 1. Use Strict Mode

Always enable strict mode in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## 2. Avoid `any` Type

The `any` type defeats the purpose of TypeScript. Instead, use:

- **`unknown`** for values of truly unknown type
- **Union types** for values that can be one of several types
- **Generics** for reusable type-safe code

### Bad Example

```typescript
function processData(data: any) {
  return data.value; // No type safety!
}
```

### Good Example

```typescript
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value; // Type-safe!
}
```

## 3. Use Type Guards

Type guards help narrow down union types:

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: string | number) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TypeScript knows it's a string
  } else {
    console.log(value.toFixed(2)); // TypeScript knows it's a number
  }
}
```

## 4. Leverage Utility Types

TypeScript provides powerful utility types:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Partial - makes all properties optional
type PartialUser = Partial<User>;

// Pick - select specific properties
type UserPreview = Pick<User, "id" | "name">;

// Omit - exclude specific properties
type UserWithoutEmail = Omit<User, "email">;

// Readonly - make all properties readonly
type ImmutableUser = Readonly<User>;
```

## 5. Use `const` Assertions

For literal types and immutable data:

```typescript
// Without const assertion
const colors = ["red", "green", "blue"]; // Type: string[]

// With const assertion
const colors = ["red", "green", "blue"] as const;
// Type: readonly ["red", "green", "blue"]
```

## 6. Discriminated Unions

Great for handling different states:

```typescript
interface LoadingState {
  status: "loading";
}

interface SuccessState {
  status: "success";
  data: string;
}

interface ErrorState {
  status: "error";
  error: string;
}

type State = LoadingState | SuccessState | ErrorState;

function handleState(state: State) {
  switch (state.status) {
    case "loading":
      console.log("Loading...");
      break;
    case "success":
      console.log("Data:", state.data); // TypeScript knows data exists
      break;
    case "error":
      console.log("Error:", state.error); // TypeScript knows error exists
      break;
  }
}
```

## 7. Generic Constraints

Use constraints to make generic types more specific:

```typescript
interface HasId {
  id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}
```

## Mathematical Interlude

The time complexity of TypeScript's type checker for deeply nested types
can be approximated as:

$$T(n) = O(2^n)$$

where $n$ is the depth of type nesting. Keep your types simple!

## Conclusion

TypeScript's type system is incredibly powerful. By following these
practices, you'll write safer, more maintainable code. Remember: **the
compiler is your friend, not your enemy!**

---

Happy coding! 🚀
