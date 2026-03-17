import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LinkFeature } from '../../src/features/link';
import { SelectionManager } from '../../src/core/selection';

function makeSetup() {
  const editorArea = document.createElement('div');
  editorArea.className = 'ray-editor-content';
  editorArea.contentEditable = 'true';
  document.body.appendChild(editorArea);

  const selectionManager = new SelectionManager();
  const feature = new LinkFeature(editorArea, selectionManager);
  return { editorArea, selectionManager, feature };
}

describe('LinkFeature', () => {
  let editorArea: HTMLElement;
  let feature: LinkFeature;

  beforeEach(() => {
    document.body.innerHTML = '';
    ({ editorArea, feature } = makeSetup());
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ─── openLinkModal ────────────────────────────────────────────────────────

  describe('openLinkModal', () => {
    it('renders a modal with ray-editor-link-modal class', () => {
      feature.openLinkModal();
      const modal = document.querySelector('.ray-editor-link-modal');
      expect(modal).not.toBeNull();
    });

    it('renders URL input with id ray-link-url', () => {
      feature.openLinkModal();
      expect(document.querySelector('#ray-link-url')).not.toBeNull();
    });

    it('URL input has aria-label="URL"', () => {
      feature.openLinkModal();
      const input = document.querySelector('#ray-link-url');
      expect(input?.getAttribute('aria-label')).toBe('URL');
    });

    it('renders target select with id ray-link-target', () => {
      feature.openLinkModal();
      expect(document.querySelector('#ray-link-target')).not.toBeNull();
    });

    it('renders rel select with id ray-link-rel', () => {
      feature.openLinkModal();
      expect(document.querySelector('#ray-link-rel')).not.toBeNull();
    });

    it('shows "Insert Link" title when no anchor provided', () => {
      feature.openLinkModal();
      const modal = document.querySelector('.ray-editor-link-modal');
      expect(modal?.textContent).toContain('Insert Link');
    });

    it('shows "Edit Link" title when anchor is provided', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      feature.openLinkModal(anchor);
      const modal = document.querySelector('.ray-editor-link-modal');
      expect(modal?.textContent).toContain('Edit Link');
    });

    it('pre-fills href when editing existing anchor', () => {
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com');
      feature.openLinkModal(anchor);
      const urlInput = document.querySelector<HTMLInputElement>('#ray-link-url');
      expect(urlInput?.value).toBe('https://example.com');
    });

    it('pre-fills target when editing existing anchor', () => {
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com');
      anchor.setAttribute('target', '_blank');
      feature.openLinkModal(anchor);
      const targetSelect = document.querySelector<HTMLSelectElement>('#ray-link-target');
      expect(targetSelect?.value).toBe('_blank');
    });

    it('cancel button removes the modal', () => {
      feature.openLinkModal();
      const cancelBtn = document.querySelector<HTMLButtonElement>('#ray-cancel-link');
      cancelBtn?.click();
      expect(document.querySelector('.ray-editor-link-modal')).toBeNull();
    });

    it('shows error when insert is clicked with empty URL', () => {
      feature.openLinkModal();
      const insertBtn = document.querySelector<HTMLButtonElement>('#ray-insert-link');
      insertBtn?.click();
      const error = document.querySelector<HTMLElement>('#ray-link-url-error');
      expect(error?.style.display).toBe('block');
    });

    it('blocks javascript: URLs with sanitization error', () => {
      feature.openLinkModal();
      const urlInput = document.querySelector<HTMLInputElement>('#ray-link-url')!;
      urlInput.value = 'javascript:alert(1)';
      const insertBtn = document.querySelector<HTMLButtonElement>('#ray-insert-link');
      insertBtn?.click();
      const error = document.querySelector<HTMLElement>('#ray-link-url-error');
      expect(error?.style.display).toBe('block');
      expect(error?.textContent).toContain('blocked');
    });
  });

  // ─── showLinkPopup ────────────────────────────────────────────────────────

  describe('showLinkPopup', () => {
    it('renders popup with ray-editor-link-edit-remove class', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      document.body.appendChild(anchor);
      feature.showLinkPopup(anchor);
      expect(document.querySelector('.ray-editor-link-edit-remove')).not.toBeNull();
    });

    it('edit button has aria-label="Edit link"', () => {
      const anchor = document.createElement('a');
      document.body.appendChild(anchor);
      feature.showLinkPopup(anchor);
      const editBtn = document.querySelector('.ray-edit-link-btn');
      expect(editBtn?.getAttribute('aria-label')).toBe('Edit link');
    });

    it('remove button has aria-label="Remove link"', () => {
      const anchor = document.createElement('a');
      document.body.appendChild(anchor);
      feature.showLinkPopup(anchor);
      const removeBtn = document.querySelector('.ray-remove-link-btn');
      expect(removeBtn?.getAttribute('aria-label')).toBe('Remove link');
    });
  });

  // ─── showLinkTooltip ──────────────────────────────────────────────────────

  describe('showLinkTooltip', () => {
    it('creates a tooltip element with class ray-link-tooltip', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      expect(document.querySelector('.ray-link-tooltip')).not.toBeNull();
    });

    it('tooltip shows the link URL', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com/page';
      anchor.setAttribute('href', 'https://example.com/page');
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      const tooltip = document.querySelector('.ray-link-tooltip');
      expect(tooltip?.textContent).toContain('example.com');
    });

    it('tooltip has an open link button', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      const openBtn = document.querySelector('.ray-link-tooltip-open');
      expect(openBtn).not.toBeNull();
    });

    it('open button has aria-label', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      const openBtn = document.querySelector('.ray-link-tooltip-open');
      expect(openBtn?.getAttribute('aria-label')).toBeTruthy();
    });

    it('open button has correct href attribute', () => {
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com');
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      const openBtn = document.querySelector<HTMLAnchorElement>('.ray-link-tooltip-open');
      expect(openBtn?.getAttribute('href')).toBe('https://example.com');
    });

    it('truncates URL longer than 50 chars with ellipsis', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(60);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', longUrl);
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      const urlSpan = document.querySelector('.ray-link-tooltip-url');
      expect(urlSpan?.textContent?.length).toBeLessThanOrEqual(51); // 47 + '…'
    });
  });

  // ─── hideLinkTooltip ──────────────────────────────────────────────────────

  describe('hideLinkTooltip', () => {
    it('removes the tooltip immediately when delay=0', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      document.body.appendChild(anchor);
      feature.showLinkTooltip(anchor);
      expect(document.querySelector('.ray-link-tooltip')).not.toBeNull();
      feature.hideLinkTooltip(0);
      expect(document.querySelector('.ray-link-tooltip')).toBeNull();
    });

    it('does not throw when no tooltip is visible', () => {
      expect(() => feature.hideLinkTooltip(0)).not.toThrow();
    });
  });

  // ─── removeLink ───────────────────────────────────────────────────────────

  describe('removeLink', () => {
    it('unwraps anchor preserving its text content', () => {
      const p = document.createElement('p');
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      anchor.textContent = 'Click here';
      p.appendChild(anchor);
      editorArea.appendChild(p);

      feature.removeLink(anchor);

      expect(p.querySelector('a')).toBeNull();
      expect(p.textContent).toBe('Click here');
    });
  });
});
