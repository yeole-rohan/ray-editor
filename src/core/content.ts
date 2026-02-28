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
      if (isEffectivelyEmpty(el)) el.remove();
    });

    // Replace unclassed divs with <p>
    tempDiv.querySelectorAll('div:not([class])').forEach(div => {
      if (isInsideCodeBlock(div)) return;
      const p = document.createElement('p');
      p.innerHTML = div.innerHTML;
      div.parentNode?.replaceChild(p, div);
    });

    // Mark code blocks as non-editable in output
    tempDiv.querySelectorAll('.ray-code-content').forEach(pre => {
      pre.setAttribute('contenteditable', 'false');
    });

    return tempDiv.innerHTML;
  }

  setContent(html: string): void {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Make code blocks editable inside editor
    temp.querySelectorAll('.ray-code-content').forEach(pre => {
      pre.setAttribute('contenteditable', 'true');
      pre.setAttribute('spellcheck', 'false');
    });

    this.editorArea.innerHTML = temp.innerHTML;
    temp.remove();
  }
}
