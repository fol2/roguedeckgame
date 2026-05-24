export type Rng = {
  readonly nextFloat: () => number;
  readonly nextInt: (maxExclusive: number) => number;
  readonly choice: <T>(items: readonly T[]) => T;
  readonly shuffle: <T>(items: readonly T[]) => T[];
};

const normaliseSeed = (seed: string | number): number => {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const createRng = (seed: string | number): Rng => {
  let state = normaliseSeed(seed) || 0x9e3779b9;

  const nextState = (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const nextFloat = (): number => nextState();

  const nextInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError("maxExclusive must be a positive integer");
    }

    return Math.floor(nextFloat() * maxExclusive);
  };

  const choice = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError("Cannot choose from an empty collection");
    }

    return items[nextInt(items.length)] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = nextInt(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
    }

    return result;
  };

  return { nextFloat, nextInt, choice, shuffle };
};
