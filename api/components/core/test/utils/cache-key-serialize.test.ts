import { serializeContext, serializeEntry } from '../../src/utils/cache-key-serialize';

describe('cache-key-serialize utils', () => {
  it('serializes nested objects with dotted paths', () => {
    const result = serializeContext({
      user: {
        id: 1,
        profile: {
          active: true
        }
      }
    });

    expect(result).toBe('user.id=1&user.profile.active=true');
  });

  it('serializes arrays with indexed paths', () => {
    const result = serializeEntry(['a', 'b'], 'tags');

    expect(result).toEqual(['tags[0]=a', 'tags[1]=b']);
  });
});
