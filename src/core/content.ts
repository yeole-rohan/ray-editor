import { buildCodeBlock } from '../features/codeblock.js';
import { TaskListFeature, serializeTaskLists } from '../features/tasklist.js';
import { FileFeature } from '../features/file.js';

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

    // Remove <p> inside list items (but not task list items — they use spans)
    tempDiv.querySelectorAll('ul li:not(.ray-task-item), ol li:not(.ray-task-item)').forEach(li => {
      if (isInsideCodeBlock(li)) return;
      const p = li.querySelector('p');
      if (p) {
        li.innerHTML = li.innerHTML.replace(p.outerHTML, p.innerHTML);
      }
    });

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
      // Don't clean task list text spans (backward-compat with old serialized format)
      if (el.classList.contains('ray-task-checkbox') || el.classList.contains('ray-task-text')) return;
      if (isEffectivelyEmpty(el)) el.remove();
    });

    // Replace unclassed divs with <p> (but not callout bodies)
    tempDiv.querySelectorAll('div:not([class])').forEach(div => {
      if (isInsideCodeBlock(div)) return;
      const p = document.createElement('p');
      p.innerHTML = div.innerHTML;
      div.parentNode?.replaceChild(p, div);
    });

    // Serialize task list items → clean output (strip span structure, keep data-checked)
    serializeTaskLists(tempDiv);

    // Unwrap .ray-table-wrapper: output bare <table> for clean HTML
    tempDiv.querySelectorAll('.ray-table-wrapper').forEach(wrapper => {
      const table = wrapper.querySelector('table');
      if (table) {
        wrapper.parentNode?.replaceChild(table, wrapper);
      } else {
        wrapper.remove();
      }
    });

    // Clean up code blocks: strip UI chrome, unwrap outer div, output bare <pre data-lang>
    tempDiv.querySelectorAll('.ray-code-block').forEach(block => {
      const lang = block.getAttribute('data-lang') ?? 'plaintext';
      const pre = block.querySelector<HTMLElement>('.ray-code-content');
      if (pre) {
        pre.setAttribute('data-lang', lang);
        pre.removeAttribute('contenteditable');
        // Strip hljs syntax classes — output clean text only
        pre.querySelectorAll('[class]').forEach(el => {
          if (Array.from(el.classList).some(c => c.startsWith('hljs'))) {
            const text = document.createTextNode(el.textContent ?? '');
            el.parentNode?.replaceChild(text, el);
          }
        });
        block.parentNode?.replaceChild(pre, block);
      } else {
        block.remove();
      }
    });

    // Strip contenteditable from date-time, callout, and file figure elements
    tempDiv.querySelectorAll('.ray-date-time, .ray-callout, .ray-callout-icon, .ray-callout-body, .ray-file-figure, .ray-file-figure figcaption').forEach(el => {
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
    this.applyStructure(temp);
    this.editorArea.innerHTML = temp.innerHTML;
    temp.remove();
  }

  /**
   * Converts clean HTML (getContent output or pasted normalized HTML) into
   * the editor's live DOM structure: code blocks, table wrappers, task lists,
   * callout contenteditable restoration.
   *
   * Called by setContent() and by the paste handler after normalization.
   */
  applyStructure(container: HTMLElement): void {
    // Wrap bare <table> in .ray-table-wrapper for overflow-x scroll
    container.querySelectorAll('table').forEach(table => {
      if (table.closest('.ray-table-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'ray-table-wrapper';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    // Rebuild full code block UI from bare <pre data-lang> or <pre><code>
    container.querySelectorAll('pre').forEach(pre => {
      if (pre.closest('.ray-code-block')) return;
      const lang = pre.getAttribute('data-lang') ?? 'plaintext';
      const block = buildCodeBlock(lang, pre.innerHTML);
      pre.parentNode?.replaceChild(block, pre);
    });

    // Re-enable contenteditable on already-wrapped code blocks
    container.querySelectorAll('.ray-code-content').forEach(pre => {
      pre.setAttribute('contenteditable', 'true');
      pre.setAttribute('spellcheck', 'false');
    });

    // Restore task list span structure from clean getContent() output
    TaskListFeature.restoreFromHTML(container);

    // Restore file figure contenteditable
    FileFeature.restoreFromHTML(container);

    // Restore callout contenteditable
    container.querySelectorAll<HTMLElement>('.ray-callout').forEach(callout => {
      callout.setAttribute('contenteditable', 'false');
      const body = callout.querySelector<HTMLElement>('.ray-callout-body');
      if (body) body.setAttribute('contenteditable', 'true');
      const icon = callout.querySelector<HTMLElement>('.ray-callout-icon');
      if (icon) icon.setAttribute('contenteditable', 'false');
    });
  }
}
