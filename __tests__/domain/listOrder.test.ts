import { describe, expect, it } from '@jest/globals';
import { moveItem } from '@/domain/listOrder';

describe('moveItem', () => {
  it('swaps with the next or previous neighbour', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('returns null at the edges and for an index outside the list', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toBeNull();
    expect(moveItem(['a', 'b'], 1, 1)).toBeNull();
    expect(moveItem(['a', 'b'], -1, 1)).toBeNull();
    expect(moveItem(['a', 'b'], 5, -1)).toBeNull();
    expect(moveItem([], 0, 1)).toBeNull();
  });

  it('does not mutate the original list', () => {
    const list = ['a', 'b', 'c'];
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});
