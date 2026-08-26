import {
  joinWithLimit,
  resolveAttachmentDisplayNames,
  sanitizeUserNoiDung
} from './PhvbMagHistoryText.utils';

describe('PhvbMagHistoryText', () => {
  it('joins values with comma and limits long lists', () => {
    expect(joinWithLimit(['a.pdf', 'b.pdf', 'c.pdf'])).toBe('a.pdf, b.pdf, c.pdf');
    expect(joinWithLimit(
      ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf', 'e.pdf', 'f.pdf', 'g.pdf'],
      { moreLabel: 'tệp khác' }
    )).toBe('a.pdf, b.pdf, c.pdf, d.pdf, e.pdf và 2 tệp khác');
  });

  it('resolves attachment display names consistently', () => {
    expect(resolveAttachmentDisplayNames([
      { name: 'bao-cao.pdf' },
      { id: 42 },
      {}
    ])).toEqual(['bao-cao.pdf', 'ID 42', '']);
  });

  it('sanitizes user-entered content', () => {
    const longText = new Array(2105).join('a');
    const result = sanitizeUserNoiDung(`<b>Ý kiến</b>\r\n\r\n\r\n${longText}`);

    expect(result.indexOf('<b>')).toBe(-1);
    expect(result.indexOf('\r\n')).toBe(-1);
    expect(result.indexOf('\n\n\n')).toBe(-1);
    expect(result.length).toBe(2001);
    expect(result.charAt(result.length - 1)).toBe('…');
  });
});
