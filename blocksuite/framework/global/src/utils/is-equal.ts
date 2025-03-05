// https://stackoverflow.com/questions/31538010/test-if-a-variable-is-a-primitive-rather-than-an-object
export function isPrimitive(
  a: unknown
): a is null | undefined | boolean | number | string {
  return a !== Object(a);
}

export function assertType<T>(_: unknown): asserts _ is T {}

export type Equals<X, Y> =
  ///
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Allowed =
  | unknown
  | void
  | null
  | undefined
  | boolean
  | number
  | string
  | unknown[]
  | object;
export function isEqual<T extends Allowed, U extends T>(
  val: T,
  expected: U
): Equals<T, U> {
  const a = isPrimitive(val);
  const b = isPrimitive(expected);
  if (a && b) {
    if (!Object.is(val, expected)) {
      return false as Equals<T, U>;
    }
  } else if (a !== b) {
    return false as Equals<T, U>;
  } else {
    if (Array.isArray(val) && Array.isArray(expected)) {
      if (val.length !== expected.length) {
        return false as Equals<T, U>;
      }
      return val.every((x, i) => isEqual(x, expected[i])) as Equals<T, U>;
    } else if (typeof val === 'object' && typeof expected === 'object') {
      const obj1 = Object.entries(val as Record<string, unknown>);
      const obj2 = Object.entries(expected as Record<string, unknown>);
      if (obj1.length !== obj2.length) {
        return false as Equals<T, U>;
      }
      return obj1.every((x, i) => isEqual(x, obj2[i])) as Equals<T, U>;
    }
  }
  return true as Equals<T, U>;
}
