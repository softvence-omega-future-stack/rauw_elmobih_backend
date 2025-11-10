export function excludeFields<T, Key extends keyof T>(
  entity: T,
  keys: Key[],
): Omit<T, Key> {
  if (!entity) return entity;
  for (const key of keys) {
    delete entity[key];
  }
  return entity;
}
