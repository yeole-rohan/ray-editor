import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MentionsFeature } from '../../src/features/mentions';

describe('MentionsFeature — bug fix #2 verification', () => {
  let editorArea: HTMLElement;

  beforeEach(() => {
    editorArea = document.createElement('div');
    editorArea.contentEditable = 'true';
    document.body.appendChild(editorArea);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses span element when mentionElement is span', () => {
    new MentionsFeature(editorArea, {
      enableMentions: true,
      mentionElement: 'span',
    });
    // The bug was: !x === 'span' always false, so element was always span regardless.
    // Fix: x !== 'span' && x !== 'a'
    // Correct behavior: 'span' option → span element rendered
    editorArea.innerHTML = '<p>@john</p>';

    // Simulate the mention handling
    const feature = new MentionsFeature(editorArea, {
      enableMentions: true,
      mentionElement: 'span',
    });

    // Trigger via key event
    const event = new KeyboardEvent('keyup', { key: ' ' });
    const p = editorArea.querySelector('p')!;
    feature.handleKeyUp(event, p);

    // After processing, @john should be a span.ray-mention
    const mentions = editorArea.querySelectorAll('span.ray-mention');
    expect(mentions.length).toBeGreaterThan(0);
  });

  it('uses a element when mentionElement is a', () => {
    const feature = new MentionsFeature(editorArea, {
      enableMentions: true,
      mentionElement: 'a',
      mentionUrl: 'https://example.com/user/',
    });

    editorArea.innerHTML = '<p>@jane</p>';
    const event = new KeyboardEvent('keyup', { key: ' ' });
    const p = editorArea.querySelector('p')!;
    feature.handleKeyUp(event, p);

    const anchors = editorArea.querySelectorAll('a.ray-mention');
    expect(anchors.length).toBeGreaterThan(0);

    const anchor = anchors[0] as HTMLAnchorElement;
    expect(anchor.href).toContain('example.com/user/');
  });

  it('does not process mentions when enableMentions is false', () => {
    const feature = new MentionsFeature(editorArea, {
      enableMentions: false,
    });

    editorArea.innerHTML = '<p>@nobody</p>';
    const event = new KeyboardEvent('keyup', { key: ' ' });
    const p = editorArea.querySelector('p')!;
    feature.handleKeyUp(event, p);

    // Content should remain unchanged
    expect(editorArea.querySelector('.ray-mention')).toBeNull();
  });
});
