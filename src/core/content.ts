import { buildCodeBlock } from '../features/codeblock.js';

/**
 * Content get/set/clean logic.
 */
export class ContentManager {
  private editorArea: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  getContent(): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.editorArea.innerHTML;

    const tagsToClean = ['p', 'a', 'span', 'b', 'i', 'u', 'strong', 'em'];

    const isInsideCodeBlock = (el: Element): boolean =>
      el.closest('pre, code, .ray-code-block') !== null;

    // Remove <p> inside list items
    const removePInsideList = () => {
      tempDiv.querySelectorAll('ul li, ol li').forEach(li => {
        if (isInsideCodeBlock(li)) return;
        const p = li.querySelector('p');
        if (p) {
          li.innerHTML = li.innerHTML.replace(p.outerHTML, p.innerHTML);
        }
      });
    };

    removePInsideList();

    // Remove empty inline elements
    const isEffectivelyEmpty = (el: Element): boolean => {
      if (isInsideCodeBlock(el)) return false;

      tagsToClean.forEach(tag => {
        el.querySelectorAll(tag).forEach(child => {
          if (isInsideCodeBlock(child)) return;
          if (!child.textContent?.trim() && child.children.length === 0) {
            child.remove();
          }
        });
      });

      return !el.textContent?.trim() && el.children.length === 0;
    };

    const allTargets = Array.from(
      tempDiv.querySelectorAll(tagsToClean.join(','))
    ).reverse();

    allTargets.forEach(el => {
      if (isInsideCodeBlock(el)) return;
      if (el.classList.contains('ray-date-time')) return;
      if (isEffectivelyEmpty(el)) el.remove();
    });

    // Replace unclassed divs with <p>
    tempDiv.querySelectorAll('div:not([class])').forEach(div => {
      if (isInsideCodeBlock(div)) return;
      const p = document.createElement('p');
      p.innerHTML = div.innerHTML;
      div.parentNode?.replaceChild(p, div);
    });

    // Clean up code blocks: strip UI chrome, unwrap outer div, output bare <pre data-lang>
    tempDiv.querySelectorAll('.ray-code-block').forEach(block => {
      const lang = block.getAttribute('data-lang') ?? 'plaintext';
      const pre = block.querySelector<HTMLElement>('.ray-code-content');
      if (pre) {
        pre.setAttribute('data-lang', lang);
        pre.removeAttribute('contenteditable');
        block.parentNode?.replaceChild(pre, block);
      } else {
        block.remove();
      }
    });

    // Strip contenteditable from date-time elements
    tempDiv.querySelectorAll('.ray-date-time').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // Remove zero-width spaces left by cursor anchoring
    const stripZWS = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue?.includes('\u200B')) {
          node.nodeValue = node.nodeValue.replace(/\u200B/g, '');
        }
      } else {
        node.childNodes.forEach(stripZWS);
      }
    };
    stripZWS(tempDiv);

    return tempDiv.innerHTML;
  }

  setContent(html: string): void {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Rebuild full code block UI from bare <pre data-lang> (getContent output)
    // Also handles <pre><code> from external HTML
    temp.querySelectorAll('pre').forEach(pre => {
      if (pre.closest('.ray-code-block')) return; // already wrapped
      const lang = pre.getAttribute('data-lang') ?? 'plaintext';
      const block = buildCodeBlock(lang, pre.innerHTML);
      pre.parentNode?.replaceChild(block, pre);
    });

    // If already wrapped (editor format), just re-enable contenteditable
    temp.querySelectorAll('.ray-code-content').forEach(pre => {
      pre.setAttribute('contenteditable', 'true');
      pre.setAttribute('spellcheck', 'false');
    });

    this.editorArea.innerHTML = temp.innerHTML;
    temp.remove();
  }
}
