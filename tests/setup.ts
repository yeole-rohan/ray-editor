// jsdom setup — polyfill APIs missing from jsdom

// execCommand is not fully implemented in jsdom
document.execCommand = vi.fn().mockReturnValue(true);

// getComputedStyle stub for toolbar tests
window.getComputedStyle = vi.fn().mockReturnValue({
  fontFamily: 'Arial',
  display: 'block',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  paddingLeft: '0',
  paddingRight: '0',
} as CSSStyleDeclaration);

// ResizeObserver stub
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// matchMedia stub
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// requestAnimationFrame stub
window.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
