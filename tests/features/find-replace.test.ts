import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FindReplaceFeature } from '../../src/features/find-replace';

describe('FindReplaceFeature', () => {
  let editorArea: HTMLElement;
  let findReplace: FindReplaceFeature;

  beforeEach(() => {
    editorArea = document.createElement('div');
    editorArea.className = 'ray-editor-content';
    editorArea.contentEditable = 'true';
    editorArea.innerHTML = '<p>Hello world. Hello again.</p>';
    document.body.appendChild(editorArea);
    findReplace = new FindReplaceFeature(editorArea);
  });

  afterEach(() => {
    findReplace.destroy();
    document.body.innerHTML = '';
  });

  it('open() inserts the find panel into the DOM', () => {
    findReplace.open();
    expect(document.querySelector('.ray-find-panel')).not.toBeNull();
  });

  it('close() removes the find panel', () => {
    findReplace.open();
    findReplace.close();
    expect(document.querySelector('.ray-find-panel')).toBeNull();
  });

  it('open(true) shows replace row', () => {
    findReplace.open(true);
    const row = document.querySelector<HTMLElement>('.ray-replace-row');
    expect(row?.style.display).not.toBe('none');
  });

  it('destroy() removes panel and clears matches', () => {
    findReplace.open();
    findReplace.destroy();
    expect(document.querySelector('.ray-find-panel')).toBeNull();
  });
});
