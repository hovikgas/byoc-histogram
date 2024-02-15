/** General helper functions. */

/**
 * Compares two arrays to see if the values are equal.
 */
export function arraysAreEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.sort().every((value, index) => value === b.sort()[index]);
}