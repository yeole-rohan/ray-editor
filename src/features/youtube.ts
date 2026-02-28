/**
 * YouTube URL paste detection → iframe embed.
 */
export class YouTubeFeature {
  handlePaste(e: ClipboardEvent): void {
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    const pastedText = clipboard.getData('text');
    const ytRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
    const match = pastedText.match(ytRegex);
    if (!match) return;

    e.preventDefault();

    const videoId = match[1];
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.width = '560';
    iframe.height = '315';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'ray-youtube-embed';
    iframe.style.display = 'block';
    iframe.style.margin = '1em 0';

    const afterPara = document.createElement('p');
    afterPara.innerHTML = '<br>';

    const frag = document.createDocumentFragment();
    frag.appendChild(iframe);
    frag.appendChild(afterPara);

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);

    const newRange = document.createRange();
    newRange.setStart(afterPara, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}
