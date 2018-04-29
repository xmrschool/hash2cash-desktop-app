export const PRECISION = 10 ** 12;
export default function toMonero(unformatted: number): number {
  return unformatted / PRECISION;
}
