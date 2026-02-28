import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WordCountFeature } from '../../src/features/word-count';

describe('WordCountFeature', () => {
  let editorArea: HTMLElement;
  let wordCount: WordCountFeature;

  beforeEach(() => {
    editorArea = document.createElement('div');
    editorArea.contentEditable = 'true';
    document.body.appendChild(editorArea);
    wordCount = new WordCountFeature(editorArea);
  });

  afterEach(() => {
    wordCount.destroy();
    document.body.innerHTML = '';
  });

  it('returns 0 words for empty editor', () => {
    editorArea.innerText = '';
    const { words, chars } = wordCount.getWordCount();
    expect(words).toBe(0);
    expect(chars).toBe(0);
  });

  it('counts single word', () => {
    editorArea.innerText = 'Hello';
    expect(wordCount.getWordCount().words).toBe(1);
  });

  it('counts multiple words', () => {
    editorArea.innerText = 'Hello world foo bar';
    expect(wordCount.getWordCount().words).toBe(4);
  });

  it('counts characters', () => {
    editorArea.innerText = 'Hello';
    expect(wordCount.getWordCount().chars).toBe(5);
  });

  it('ignores extra whitespace when counting words', () => {
    editorArea.innerText = '  Hello   world  ';
    expect(wordCount.getWordCount().words).toBe(2);
  });

  it('creates a status bar in the DOM', () => {
    const bar = document.querySelector('.ray-word-count-bar');
    expect(bar).not.toBeNull();
  });

  it('destroy removes status bar', () => {
    wordCount.destroy();
    const bar = document.querySelector('.ray-word-count-bar');
    expect(bar).toBeNull();
  });
});
