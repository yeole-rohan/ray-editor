import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImageFeature } from '../../src/features/image';

function makeSetup() {
  const editorArea = document.createElement('div');
  editorArea.className = 'ray-editor-content';
  editorArea.contentEditable = 'true';
  document.body.appendChild(editorArea);

  const feature = new ImageFeature(editorArea, {
    imageUploadUrl: 'https://example.com/upload',
    imageMaxSize: 5 * 1024 * 1024,
  });
  return { editorArea, feature };
}

function makeImg(src = 'https://example.com/img.png'): HTMLImageElement {
  const img = new Image();
  img.src = src;
  img.alt = 'test image';
  Object.defineProperty(img, 'offsetWidth',  { value: 200, configurable: true });
  Object.defineProperty(img, 'offsetHeight', { value: 150, configurable: true });
  return img;
}

const ALL_HANDLE_POSITIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;

describe('ImageFeature.makeImageResizable', () => {
  let feature: ImageFeature;

  beforeEach(() => {
    document.body.innerHTML = '';
    ({ feature } = makeSetup());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Wrapper (div) structure ───────────────────────────────────────────────

  it('returns an object with a wrapper element', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper).toBeInstanceOf(HTMLElement);
  });

  it('wrapper is a <div> (not a figure)', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.tagName).toBe('DIV');
  });

  it('wrapper has position: relative', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.style.position).toBe('relative');
  });

  it('wrapper has display: inline-block', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.style.display).toBe('inline-block');
  });

  it('wrapper has contentEditable false', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.contentEditable).toBe('false');
  });

  it('wrapper contains the image', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    expect(wrapper.contains(img)).toBe(true);
  });

  // ─── 8 resize handles ─────────────────────────────────────────────────────

  it('creates exactly 8 resize handles', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    const handles = wrapper.querySelectorAll('[data-handle-pos]');
    expect(handles.length).toBe(8);
  });

  it.each(ALL_HANDLE_POSITIONS)('creates a handle for position "%s"', (pos) => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.querySelector(`[data-handle-pos="${pos}"]`)).not.toBeNull();
  });

  it.each(ALL_HANDLE_POSITIONS)('handle "%s" has correct cursor style', (pos) => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    const handle = wrapper.querySelector<HTMLElement>(`[data-handle-pos="${pos}"]`)!;
    expect(handle.style.cursor).toBe(`${pos}-resize`);
  });

  it.each(ALL_HANDLE_POSITIONS)('handle "%s" has aria-label containing position', (pos) => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    const handle = wrapper.querySelector(`[data-handle-pos="${pos}"]`)!;
    expect(handle.getAttribute('aria-label')).toContain(pos);
  });

  it('all handles are initially hidden (opacity 0)', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    wrapper.querySelectorAll<HTMLElement>('[data-handle-pos]').forEach(h => {
      expect(h.style.opacity).toBe('0');
    });
  });

  // ─── Close button ──────────────────────────────────────────────────────────

  it('close button has aria-label="Remove image"', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.querySelector('[aria-label="Remove image"]')).not.toBeNull();
  });

  it('close button is initially hidden (opacity 0)', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    const closeBtn = wrapper.querySelector<HTMLElement>('[aria-label="Remove image"]')!;
    expect(closeBtn.style.opacity).toBe('0');
  });

  it('clicking close button removes the wrapper', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    const closeBtn = wrapper.querySelector<HTMLElement>('[aria-label="Remove image"]')!;
    closeBtn.click();

    expect(document.body.contains(wrapper)).toBe(false);
  });

  // ─── Edit button ──────────────────────────────────────────────────────────

  it('edit button has aria-label="Edit image"', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    expect(wrapper.querySelector('[aria-label="Edit image"]')).not.toBeNull();
  });

  it('edit button is initially hidden (opacity 0)', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    const editBtn = wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!;
    expect(editBtn.style.opacity).toBe('0');
  });

  it('clicking edit button opens the image editor modal', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    const editBtn = wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!;
    editBtn.click();

    expect(document.querySelector('.ray-img-editor-modal')).not.toBeNull();
  });

  it('image editor modal has alt text input', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!.click();

    expect(document.querySelector('#ray-alt-input')).not.toBeNull();
  });

  it('image editor modal has title input', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!.click();

    expect(document.querySelector('#ray-title-input')).not.toBeNull();
  });

  it('image editor modal has caption input', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!.click();

    expect(document.querySelector('#ray-caption-input')).not.toBeNull();
  });

  it('cancel button closes the editor modal', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!.click();
    document.querySelector<HTMLButtonElement>('#ray-img-cancel')!.click();

    expect(document.querySelector('.ray-img-editor-modal')).toBeNull();
  });

  // ─── Hover show/hide ──────────────────────────────────────────────────────

  it('mouseenter on wrapper shows all handles', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    document.body.appendChild(wrapper);

    wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    wrapper.querySelectorAll<HTMLElement>('[data-handle-pos]').forEach(h => {
      expect(h.style.opacity).toBe('1');
    });
  });

  it('mouseleave on wrapper hides all handles', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    document.body.appendChild(wrapper);

    wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    wrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    wrapper.querySelectorAll<HTMLElement>('[data-handle-pos]').forEach(h => {
      expect(h.style.opacity).toBe('0');
    });
  });

  it('mouseenter shows the close button', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    document.body.appendChild(wrapper);

    wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    const closeBtn = wrapper.querySelector<HTMLElement>('[aria-label="Remove image"]')!;
    expect(closeBtn.style.opacity).toBe('1');
  });

  it('mouseenter shows the edit button', () => {
    const { wrapper } = feature.makeImageResizable(makeImg());
    document.body.appendChild(wrapper);

    wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    const editBtn = wrapper.querySelector<HTMLElement>('[aria-label="Edit image"]')!;
    expect(editBtn.style.opacity).toBe('1');
  });

  // ─── Min size constraint ──────────────────────────────────────────────────

  it('resize respects min width of 50px on E handle drag', () => {
    const img = makeImg();
    const { wrapper } = feature.makeImageResizable(img);
    document.body.appendChild(wrapper);

    const handle = wrapper.querySelector<HTMLElement>('[data-handle-pos="e"]')!;
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 75 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 75 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(parseFloat(img.style.width)).toBeGreaterThanOrEqual(50);
  });
});
