/**
 * Path Utilities
 * Helper functions for working with nested object paths
 */

/**
 * Get value from nested object by path
 * @example getNestedValue({ a: { b: { c: 1 } } }, 'a.b.c') => 1
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * Set value in nested object by path
 * @example setNestedValue({ a: { b: {} } }, 'a.b.c', 1) => { a: { b: { c: 1 } } }
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.')
  const lastKey = keys.pop()!

  let current = obj
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }

  current[lastKey] = value
  return obj
}
