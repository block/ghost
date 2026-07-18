export type ReadOnlySnapshotMap<K, V> = ReadonlyMap<K, V>;

export function snapshotMap<K, V>(
  source: ReadonlyMap<K, V>,
): ReadOnlySnapshotMap<K, V> {
  const map = new Map<K, V>(source.entries());

  const readonlyMap: ReadOnlySnapshotMap<K, V> = {
    get size() {
      return map.size;
    },
    get(key) {
      return map.get(key);
    },
    has(key) {
      return map.has(key);
    },
    entries() {
      return map.entries();
    },
    keys() {
      return map.keys();
    },
    values() {
      return map.values();
    },
    forEach(callback, thisArg) {
      map.forEach((value, key) => {
        callback.call(thisArg, value, key, readonlyMap);
      });
    },
    [Symbol.iterator]() {
      return map[Symbol.iterator]();
    },
  };

  return Object.freeze(readonlyMap);
}
