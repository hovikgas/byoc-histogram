/** General helper functions. */

/**
 * Compares two arrays to see if the values are equal.
 */
export function arraysAreEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.sort().every((value, index) => value === b.sort()[index]);
}

export function searchObjects(obj: any, key: string, value: any): any[] {
  let results: any[] = [];

  if (obj instanceof Array) {
    for (let i in obj) {
      let res = searchObjects(obj[i], key, value);
      if (res.length > 0) results = results.concat(res);
    }
  }

  if (obj instanceof Object) {
    if(obj[key] === value) {
      results.push(obj);
    }

    for (let i in obj) {
      if(i == key) continue;
      let res = searchObjects(obj[i], key, value);
      if (res.length > 0) results = results.concat(res);
    }
  }

  return results;
}