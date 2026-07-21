/** A callable value whose arguments and result have not yet been narrowed. */
export type UnknownFunction = (...args: never[]) => unknown;

/** Determines whether an unknown value is callable. */
export function isFunction(value: unknown): value is UnknownFunction {
  return typeof value === 'function';
}
