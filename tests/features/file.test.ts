import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileFeature } from '../../src/features/file';

function makeSetup() {
  const editorArea = document.createElement('div');
  editorArea.className = 'ray-editor-content';
  editorArea.contentEditable = 'true';
  document.body.appendChild(editorArea);

  const feature = new FileFeature(editorArea, {
    fileUploadUrl: 'https://example.com/upload',
    fileMaxSize: 10 * 1024 * 1024,
  });
  return { editorArea, feature };
}

describe('FileFeature.buildFileFigure', () => {
  let feature: FileFeature;

  beforeEach(() => {
    document.body.innerHTML = '';
    ({ feature } = makeSetup());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Figure wrapper ────────────────────────────────────────────────────────

  it('returns a <figure> element', () => {
    const fig = feature.buildFileFigure('test.mp4', 'video/mp4', 'https://example.com/test.mp4');
    expect(fig.tagName).toBe('FIGURE');
  });

  it('figure has class ray-file-figure', () => {
    const fig = feature.buildFileFigure('test.mp4', 'video/mp4', 'https://example.com/test.mp4');
    expect(fig.classList.contains('ray-file-figure')).toBe(true);
  });

  it('figure has contenteditable="false"', () => {
    const fig = feature.buildFileFigure('test.mp4', 'video/mp4', 'https://example.com/test.mp4');
    expect(fig.getAttribute('contenteditable')).toBe('false');
  });

  it('figure has a <figcaption> with the filename', () => {
    const fig = feature.buildFileFigure('demo.mp3', 'audio/mpeg', 'https://example.com/demo.mp3');
    const fc = fig.querySelector('figcaption');
    expect(fc).not.toBeNull();
    expect(fc!.textContent).toBe('demo.mp3');
  });

  it('figcaption has contenteditable="true"', () => {
    const fig = feature.buildFileFigure('demo.mp3', 'audio/mpeg', 'https://example.com/demo.mp3');
    expect(fig.querySelector('figcaption')!.getAttribute('contenteditable')).toBe('true');
  });

  // ─── data-file-type ────────────────────────────────────────────────────────

  it('sets data-file-type="image" for image/* MIME', () => {
    const fig = feature.buildFileFigure('photo.jpg', 'image/jpeg', 'https://example.com/photo.jpg');
    expect(fig.dataset.fileType).toBe('image');
  });

  it('sets data-file-type="video" for video/* MIME', () => {
    const fig = feature.buildFileFigure('clip.mp4', 'video/mp4', 'https://example.com/clip.mp4');
    expect(fig.dataset.fileType).toBe('video');
  });

  it('sets data-file-type="audio" for audio/* MIME', () => {
    const fig = feature.buildFileFigure('song.mp3', 'audio/mpeg', 'https://example.com/song.mp3');
    expect(fig.dataset.fileType).toBe('audio');
  });

  it('sets data-file-type="other" for unrecognised MIME', () => {
    const fig = feature.buildFileFigure('report.pdf', 'application/pdf', 'https://example.com/report.pdf');
    expect(fig.dataset.fileType).toBe('other');
  });

  // ─── Image ─────────────────────────────────────────────────────────────────

  it('image type inserts an <img>', () => {
    const fig = feature.buildFileFigure('photo.png', 'image/png', 'https://example.com/photo.png');
    expect(fig.querySelector('img')).not.toBeNull();
  });

  it('img has correct src', () => {
    const fig = feature.buildFileFigure('photo.png', 'image/png', 'https://example.com/photo.png');
    expect(fig.querySelector('img')!.src).toContain('photo.png');
  });

  it('img alt is the filename', () => {
    const fig = feature.buildFileFigure('photo.png', 'image/png', 'https://example.com/photo.png');
    expect(fig.querySelector('img')!.alt).toBe('photo.png');
  });

  // ─── Video ─────────────────────────────────────────────────────────────────

  it('video type inserts a <video>', () => {
    const fig = feature.buildFileFigure('clip.mp4', 'video/mp4', 'https://example.com/clip.mp4');
    expect(fig.querySelector('video')).not.toBeNull();
  });

  it('video has controls attribute', () => {
    const fig = feature.buildFileFigure('clip.mp4', 'video/mp4', 'https://example.com/clip.mp4');
    expect(fig.querySelector('video')!.controls).toBe(true);
  });

  it('video src matches the supplied URL', () => {
    const fig = feature.buildFileFigure('clip.webm', 'video/webm', 'https://example.com/clip.webm');
    expect(fig.querySelector('video')!.src).toContain('clip.webm');
  });

  // ─── Audio ─────────────────────────────────────────────────────────────────

  it('audio type inserts an <audio>', () => {
    const fig = feature.buildFileFigure('song.mp3', 'audio/mpeg', 'https://example.com/song.mp3');
    expect(fig.querySelector('audio')).not.toBeNull();
  });

  it('audio has controls attribute', () => {
    const fig = feature.buildFileFigure('song.mp3', 'audio/mpeg', 'https://example.com/song.mp3');
    expect(fig.querySelector('audio')!.controls).toBe(true);
  });

  it('audio src matches the supplied URL', () => {
    const fig = feature.buildFileFigure('podcast.ogg', 'audio/ogg', 'https://example.com/podcast.ogg');
    expect(fig.querySelector('audio')!.src).toContain('podcast.ogg');
  });

  // ─── Download link (other) ─────────────────────────────────────────────────

  it('other type inserts an <a> with class ray-file-link', () => {
    const fig = feature.buildFileFigure('report.pdf', 'application/pdf', 'https://example.com/report.pdf');
    expect(fig.querySelector('a.ray-file-link')).not.toBeNull();
  });

  it('download link has correct href', () => {
    const fig = feature.buildFileFigure('doc.zip', 'application/zip', 'https://example.com/doc.zip');
    expect(fig.querySelector('a')!.href).toContain('doc.zip');
  });

  it('download link has download attribute set to filename', () => {
    const fig = feature.buildFileFigure('report.pdf', 'application/pdf', 'https://example.com/report.pdf');
    expect(fig.querySelector('a')!.download).toBe('report.pdf');
  });

  it('download link opens in new tab', () => {
    const fig = feature.buildFileFigure('report.pdf', 'application/pdf', 'https://example.com/report.pdf');
    expect(fig.querySelector('a')!.target).toBe('_blank');
  });

  it('extension badge shows uppercased file extension', () => {
    const fig = feature.buildFileFigure('archive.zip', 'application/zip', 'https://example.com/archive.zip');
    const badge = fig.querySelector('.ray-file-ext');
    expect(badge).not.toBeNull();
    expect(badge!.textContent!.toLowerCase()).toBe('zip');
  });

  // ─── FileFeature.restoreFromHTML ───────────────────────────────────────────

  it('restoreFromHTML sets contenteditable=false on figure', () => {
    const container = document.createElement('div');
    container.innerHTML = `<figure class="ray-file-figure"><audio src="x.mp3"></audio><figcaption>x.mp3</figcaption></figure>`;
    FileFeature.restoreFromHTML(container);
    expect(container.querySelector('figure')!.getAttribute('contenteditable')).toBe('false');
  });

  it('restoreFromHTML sets contenteditable=true on figcaption', () => {
    const container = document.createElement('div');
    container.innerHTML = `<figure class="ray-file-figure"><audio src="x.mp3"></audio><figcaption>x.mp3</figcaption></figure>`;
    FileFeature.restoreFromHTML(container);
    expect(container.querySelector('figcaption')!.getAttribute('contenteditable')).toBe('true');
  });
});
