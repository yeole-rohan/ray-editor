import type { MentionOptions } from '../types/options';

/**
 * @mention / #tag system — BUG FIX #2 applied here.
 */
export class MentionsFeature {
  private editorArea: HTMLElement;
  private opts: Required<MentionOptions>;
  private mentionTagEscaped: string;

  constructor(editorArea: HTMLElement, opts: MentionOptions) {
    this.editorArea = editorArea;
    const tag = opts.mentionTag || '@';
    this.mentionTagEscaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    this.opts = {
      enableMentions: opts.enableMentions ?? true,
      mentionTag: tag,
      mentionElement: opts.mentionElement ?? 'span',
      mentionUrl: opts.mentionUrl ?? '',
    };
  }

  handleKeyUp(e: KeyboardEvent, elementNode: Element): void {
    if (!this.opts.enableMentions) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;

    const mentionRegex = new RegExp(
      '(?:^|\\s)(' + this.mentionTagEscaped + '\\w+)',
      'g'
    );
    const text = elementNode.textContent || '';
    const match = mentionRegex.exec(text);
    if (match) {
      this.handleMention(match[1]);
    }
  }

  private handleMention(username: string): void {
    if (!this.opts.enableMentions) return;

    // BUG FIX #2: was `!x === 'span'` (always false) → now correct logic
    const mentionElement =
      this.opts.mentionElement === 'a' ? 'a' : 'span';

    let content = this.editorArea.innerHTML;
    const regexReplace = new RegExp(this.mentionTagEscaped + '(\\w+)', 'g');

    content = content.replace(regexReplace, (_match, user: string) => {
      const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '');
      const el = document.createElement(mentionElement);
      el.className = 'mention ray-mention';
      (el as HTMLElement).contentEditable = 'false';
      el.textContent = this.opts.mentionTag + cleanUser;

      if (mentionElement === 'a') {
        const a = el as HTMLAnchorElement;
        if (!this.opts.mentionUrl) {
          a.href = '#';
        } else {
          a.href = this.opts.mentionUrl + cleanUser;
          a.target = '_blank';
        }
      }

      el.setAttribute('data-mention', cleanUser);
      return el.outerHTML;
    });

    this.editorArea.innerHTML = content;

    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(this.editorArea);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    this.editorArea.focus();
  }
}
