/** Fisher–Yates. Copies the input; randomness is injected so callers can test it. */
export function shuffleFisherYates<T>(
  arr: readonly T[],
  random: () => number = Math.random,
): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
