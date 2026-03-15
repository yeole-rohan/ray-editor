import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalloutFeature } from '../../src/features/callout';

describe('CalloutFeature', () => {
  let editorArea: HTMLElement;
  let feature: CalloutFeature;

  beforeEach(() => {
    document.body.innerHTML = '';
    editorArea = document.createElement('div');
    editorArea.className = 'ray-editor-content';
    editorArea.contentEditable = 'true';
    document.body.appendChild(editorArea);
    feature = new CalloutFeature(editorArea);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── insertCallout — structure ────────────────────────────────────────────

  describe('insertCallout', () => {
    it('insertCallout("info") inserts .ray-callout.ray-callout-info', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout');
      expect(callout).not.toBeNull();
      expect(callout?.classList.contains('ray-callout-info')).toBe(true);
    });

    it('insertCallout("warning") inserts .ray-callout.ray-callout-warning', () => {
      feature.insertCallout('warning');
      const callout = editorArea.querySelector('.ray-callout');
      expect(callout).not.toBeNull();
      expect(callout?.classList.contains('ray-callout-warning')).toBe(true);
    });

    it('insertCallout("success") inserts .ray-callout.ray-callout-success', () => {
      feature.insertCallout('success');
      const callout = editorArea.querySelector('.ray-callout');
      expect(callout).not.toBeNull();
      expect(callout?.classList.contains('ray-callout-success')).toBe(true);
    });

    it('insertCallout("error") inserts .ray-callout.ray-callout-error', () => {
      feature.insertCallout('error');
      const callout = editorArea.querySelector('.ray-callout');
      expect(callout).not.toBeNull();
      expect(callout?.classList.contains('ray-callout-error')).toBe(true);
    });

    it('outer .ray-callout has contenteditable="false"', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout') as HTMLElement;
      expect(callout.contentEditable).toBe('false');
    });

    it('inner .ray-callout-body has contenteditable="true"', () => {
      feature.insertCallout('info');
      const body = editorArea.querySelector('.ray-callout-body') as HTMLElement;
      expect(body).not.toBeNull();
      expect(body.contentEditable).toBe('true');
    });

    it('.ray-callout-icon is present', () => {
      feature.insertCallout('info');
      const icon = editorArea.querySelector('.ray-callout-icon');
      expect(icon).not.toBeNull();
    });

    it('.ray-callout-icon has correct emoji for "info" (ℹ️)', () => {
      feature.insertCallout('info');
      const icon = editorArea.querySelector('.ray-callout-icon');
      expect(icon?.textContent).toBe('ℹ️');
    });

    it('.ray-callout-icon has correct emoji for "warning" (⚠️)', () => {
      feature.insertCallout('warning');
      const icon = editorArea.querySelector('.ray-callout-icon');
      expect(icon?.textContent).toBe('⚠️');
    });

    it('.ray-callout-icon has correct emoji for "success" (✅)', () => {
      feature.insertCallout('success');
      const icon = editorArea.querySelector('.ray-callout-icon');
      expect(icon?.textContent).toBe('✅');
    });

    it('.ray-callout-icon has correct emoji for "error" (❌)', () => {
      feature.insertCallout('error');
      const icon = editorArea.querySelector('.ray-callout-icon');
      expect(icon?.textContent).toBe('❌');
    });

    it('.ray-callout-icon has contenteditable="false"', () => {
      feature.insertCallout('info');
      const icon = editorArea.querySelector('.ray-callout-icon') as HTMLElement;
      expect(icon.contentEditable).toBe('false');
    });

    it('.ray-callout-body is inside .ray-callout', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout');
      const body = callout?.querySelector('.ray-callout-body');
      expect(body).not.toBeNull();
    });

    it('.ray-callout-icon is inside .ray-callout', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout');
      const icon = callout?.querySelector('.ray-callout-icon');
      expect(icon).not.toBeNull();
    });

    it('.ray-callout-body contains a <p> tag with default label text', () => {
      feature.insertCallout('info');
      const body = editorArea.querySelector('.ray-callout-body');
      const p = body?.querySelector('p');
      expect(p).not.toBeNull();
      expect(p?.textContent).toContain('Info:');
    });

    it('warning callout body contains "Warning:" label', () => {
      feature.insertCallout('warning');
      const body = editorArea.querySelector('.ray-callout-body');
      const p = body?.querySelector('p');
      expect(p?.textContent).toContain('Warning:');
    });

    it('success callout body contains "Success:" label', () => {
      feature.insertCallout('success');
      const body = editorArea.querySelector('.ray-callout-body');
      const p = body?.querySelector('p');
      expect(p?.textContent).toContain('Success:');
    });

    it('error callout body contains "Error:" label', () => {
      feature.insertCallout('error');
      const body = editorArea.querySelector('.ray-callout-body');
      const p = body?.querySelector('p');
      expect(p?.textContent).toContain('Error:');
    });

    it('inserts spacer paragraphs before and after callout when no selection', () => {
      feature.insertCallout('info');
      const children = Array.from(editorArea.children);
      expect(children.length).toBe(3);
      // spacer before
      expect(children[0].tagName).toBe('P');
      // callout
      expect(children[1].classList.contains('ray-callout')).toBe(true);
      // spacer after
      expect(children[2].tagName).toBe('P');
    });

    it('multiple insertions create separate callouts', () => {
      feature.insertCallout('info');
      feature.insertCallout('warning');
      const callouts = editorArea.querySelectorAll('.ray-callout');
      expect(callouts.length).toBe(2);
    });

    it('inserts callout of correct type when called multiple times', () => {
      feature.insertCallout('info');
      feature.insertCallout('error');
      const callouts = editorArea.querySelectorAll('.ray-callout');
      expect(callouts[0].classList.contains('ray-callout-info')).toBe(true);
      expect(callouts[1].classList.contains('ray-callout-error')).toBe(true);
    });
  });

  // ─── showPicker ───────────────────────────────────────────────────────────

  describe('showPicker', () => {
    it('showPicker creates a .ray-callout-picker element in the DOM', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      // Mock getBoundingClientRect to return a real rect
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const picker = document.querySelector('.ray-callout-picker');
      expect(picker).not.toBeNull();
    });

    it('showPicker creates buttons for all four types', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const picker = document.querySelector('.ray-callout-picker');
      const buttons = picker?.querySelectorAll('button');
      expect(buttons?.length).toBe(4);
    });

    it('showPicker creates info button with correct class', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const infoBtn = document.querySelector('.ray-callout-picker-info');
      expect(infoBtn).not.toBeNull();
    });

    it('showPicker creates warning button with correct class', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const warningBtn = document.querySelector('.ray-callout-picker-warning');
      expect(warningBtn).not.toBeNull();
    });

    it('showPicker closes existing picker before opening a new one', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      feature.showPicker(anchorBtn);
      const pickers = document.querySelectorAll('.ray-callout-picker');
      expect(pickers.length).toBe(1);
    });

    it('clicking a picker button inserts the callout', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const infoBtn = document.querySelector('.ray-callout-picker-info') as HTMLButtonElement;
      infoBtn.click();
      const callout = editorArea.querySelector('.ray-callout-info');
      expect(callout).not.toBeNull();
    });

    it('clicking a picker button closes the picker', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const infoBtn = document.querySelector('.ray-callout-picker-info') as HTMLButtonElement;
      infoBtn.click();
      const picker = document.querySelector('.ray-callout-picker');
      expect(picker).toBeNull();
    });

    it('picker buttons have type="button"', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      const buttons = document.querySelectorAll('.ray-callout-picker button');
      buttons.forEach(btn => {
        expect((btn as HTMLButtonElement).type).toBe('button');
      });
    });
  });

  // ─── closePicker ──────────────────────────────────────────────────────────

  describe('closePicker', () => {
    it('closePicker removes the picker element from DOM', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      expect(document.querySelector('.ray-callout-picker')).not.toBeNull();

      feature.closePicker();
      expect(document.querySelector('.ray-callout-picker')).toBeNull();
    });

    it('closePicker is safe to call when no picker is open', () => {
      expect(() => feature.closePicker()).not.toThrow();
    });

    it('closePicker can be called multiple times without error', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      feature.closePicker();
      expect(() => feature.closePicker()).not.toThrow();
    });
  });

  // ─── destroy ──────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('destroy calls closePicker and removes picker from DOM', () => {
      const anchorBtn = document.createElement('button');
      document.body.appendChild(anchorBtn);
      anchorBtn.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50, bottom: 80, left: 100, right: 200, width: 100, height: 30,
      });
      feature.showPicker(anchorBtn);
      expect(document.querySelector('.ray-callout-picker')).not.toBeNull();

      feature.destroy();
      expect(document.querySelector('.ray-callout-picker')).toBeNull();
    });

    it('destroy is safe to call when no picker is open', () => {
      expect(() => feature.destroy()).not.toThrow();
    });

    it('destroy can be called multiple times without error', () => {
      feature.destroy();
      expect(() => feature.destroy()).not.toThrow();
    });
  });

  // ─── Cursor placement ─────────────────────────────────────────────────────

  describe('Cursor placement after insert', () => {
    it('after insertCallout, the editorArea is focused', () => {
      const focusSpy = vi.spyOn(editorArea, 'focus');
      feature.insertCallout('info');
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  // ─── Structural integrity checks ──────────────────────────────────────────

  describe('Structural integrity', () => {
    it('each callout type produces a unique variant class', () => {
      const types = ['info', 'warning', 'success', 'error'] as const;
      types.forEach(type => {
        const testArea = document.createElement('div');
        testArea.className = 'ray-editor-content';
        document.body.appendChild(testArea);
        const f = new CalloutFeature(testArea);
        f.insertCallout(type);
        const callout = testArea.querySelector('.ray-callout');
        expect(callout?.classList.contains(`ray-callout-${type}`)).toBe(true);
        testArea.remove();
      });
    });

    it('callout structure: icon comes before body', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout');
      const children = Array.from(callout?.children ?? []);
      const iconIdx = children.findIndex(c => c.classList.contains('ray-callout-icon'));
      const bodyIdx = children.findIndex(c => c.classList.contains('ray-callout-body'));
      expect(iconIdx).toBeLessThan(bodyIdx);
    });

    it('callout does not have contenteditable="true" on outer wrapper', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout') as HTMLElement;
      expect(callout.contentEditable).not.toBe('true');
    });

    it('info callout has both ray-callout and ray-callout-info classes', () => {
      feature.insertCallout('info');
      const callout = editorArea.querySelector('.ray-callout');
      expect(callout?.classList.contains('ray-callout')).toBe(true);
      expect(callout?.classList.contains('ray-callout-info')).toBe(true);
    });
  });
});
