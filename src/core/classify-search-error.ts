export type SearchFailure =
  | { kind: 'aborted' }
  | { kind: 'timeout' }
  | { kind: 'http'; status: number }
  | { kind: 'network' }
  | { kind: 'unknown' };

export function classifySearchError(_error: unknown): SearchFailure {
  throw new Error('Not implemented');
}
