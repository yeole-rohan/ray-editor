import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../../src/core/history';

describe('HistoryManager', () => {
  let editorArea: HTMLElement;
  let history: HistoryManager;

  beforeEach(() => {
    editorArea = document.createElement('div');
    editorArea.contentEditable = 'true';
    document.body.appendChild(editorArea);
    history = new HistoryManager(editorArea, 10);
  });

  it('canUndo is false initially', () => {
    expect(history.canUndo()).toBe(false);
  });

  it('canRedo is false initially', () => {
    expect(history.canRedo()).toBe(false);
  });

  it('push adds history entries', () => {
    history.push('<p>state 1</p>');
    expect(history.canUndo()).toBe(false); // index is 0, need > 0 to undo

    history.push('<p>state 2</p>');
    expect(history.canUndo()).toBe(true);
  });

  it('undo restores previous state', () => {
    history.push('<p>state 1</p>');
    history.push('<p>state 2</p>');
    history.undo();
    expect(editorArea.innerHTML).toBe('<p>state 1</p>');
  });

  it('redo re-applies state after undo', () => {
    history.push('<p>state 1</p>');
    history.push('<p>state 2</p>');
    history.undo();
    history.redo();
    expect(editorArea.innerHTML).toBe('<p>state 2</p>');
  });

  it('push after undo discards redo stack', () => {
    history.push('<p>s1</p>');
    history.push('<p>s2</p>');
    history.undo();
    history.push('<p>s3</p>');
    expect(history.canRedo()).toBe(false);
  });

  it('does not create duplicate entries', () => {
    history.push('<p>same</p>');
    history.push('<p>same</p>');
    // Should not be able to undo the duplicate
    expect(history.canUndo()).toBe(false);
  });

  it('respects maxSize limit', () => {
    const smallHistory = new HistoryManager(editorArea, 3);
    smallHistory.push('<p>1</p>');
    smallHistory.push('<p>2</p>');
    smallHistory.push('<p>3</p>');
    smallHistory.push('<p>4</p>');
    // After 4 pushes with maxSize 3, can still undo but only 3 deep
    expect(smallHistory.canUndo()).toBe(true);
  });
});
