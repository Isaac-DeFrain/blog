/**
 * @module typescript-runner/TypeScriptTransformer
 *
 * Transforms TypeScript code to JavaScript by stripping type annotations.
 */

/**
 * Transforms TypeScript code to JavaScript.
 */
export class TypeScriptTransformer {
  /**
   * Strips TypeScript type annotations from code to convert it to JavaScript.
   * This is a simple approach that handles common cases but may not cover all TypeScript features.
   *
   * @param typescriptCode - The TypeScript source code
   * @returns JavaScript code with type annotations removed
   */
  static stripTypeScriptTypes(typescriptCode: string): string {
    let jsCode = typescriptCode;

    // Remove type annotations from function parameters: (x: number) => (x)
    jsCode = jsCode.replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*(?=\s*[,)])/g, "");

    // Remove type annotations from variable declarations: const x: number = -> const x =
    jsCode = jsCode.replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*(?=\s*[=,;])/g, "");

    // Remove type assertions: as Type -> (empty)
    jsCode = jsCode.replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*/g, "");

    // Remove interface declarations (multiline)
    jsCode = jsCode.replace(/interface\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\{[^}]*\}/g, "");

    // Remove type aliases: type X = ...
    jsCode = jsCode.replace(/type\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[^;]+;/g, "");

    // Remove generic type parameters from function declarations: <T> -> (empty)
    jsCode = jsCode.replace(/<[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*>(?=\s*\()/g, "");

    return jsCode;
  }

  /**
   * Wraps TypeScript code in a run() function and converts it to JavaScript.
   * This is called at build time when processing markdown.
   *
   * @param typescriptCode - The TypeScript source code to wrap and convert
   * @returns The JavaScript code with run() function
   */
  static wrapTypeScriptCode(typescriptCode: string): string {
    const jsCode = TypeScriptTransformer.stripTypeScriptTypes(typescriptCode);
    return TypeScriptTransformer.wrapJsCodeRun(jsCode);
  }

  /**
   * Wraps JavaScript code in a run() function.
   *
   * @param jsCode - The JavaScript code to wrap
   * @returns The wrapped code with run() function
   */
  static wrapJsCodeRun(jsCode: string): string {
    return `function run(stdout, stderr) {\n${jsCode}\n}`;
  }
}
