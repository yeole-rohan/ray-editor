import type { SlashCommandConfig, RayEditorInstance } from '../types/plugin';
import { escapeHtml } from '../core/sanitize';

/**
 * Notion-style slash command palette.
 * Trigger: type "/" at start of an empty block.
 */
export class SlashCommandFeature {
  private editorArea: HTMLElement;
  private commands: SlashCommandConfig[] = [];
  private palette: HTMLElement | null = null;
  private filteredCommands: SlashCommandConfig[] = [];
  private selectedIndex = 0;
  private query = '';
  private triggerRange: Range | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
    this.bindEvents();
  }

  registerCommand(cmd: SlashCommandConfig): void {
    this.commands.push(cmd);
  }

  registerDefaultCommands(editor: RayEditorInstance): void {
    const defaults: SlashCommandConfig[] = [
      {
        name: 'Heading 1',
        icon: 'H1',
        description: 'Large section heading',
        action: () => document.execCommand('formatBlock', false, '<h1>'),
      },
      {
        name: 'Heading 2',
        icon: 'H2',
        description: 'Medium section heading',
        action: () => document.execCommand('formatBlock', false, '<h2>'),
      },
      {
        name: 'Heading 3',
        icon: 'H3',
        description: 'Small section heading',
        action: () => document.execCommand('formatBlock', false, '<h3>'),
      },
      {
        name: 'Paragraph',
        icon: '¶',
        description: 'Plain text paragraph',
        action: () => document.execCommand('formatBlock', false, '<p>'),
      },
      {
        name: 'Bulleted List',
        icon: '•',
        description: 'Unordered bullet list',
        action: () => document.execCommand('insertUnorderedList'),
      },
      {
        name: 'Numbered List',
        icon: '1.',
        description: 'Ordered numbered list',
        action: () => document.execCommand('insertOrderedList'),
      },
      {
        name: 'Blockquote',
        icon: '"',
        description: 'Capture a quote',
        action: () => document.execCommand('formatBlock', false, 'blockquote'),
      },
      {
        name: 'Code Block',
        icon: '</>',
        description: 'Code snippet with syntax block',
        action: () => {
          // Use editor's codeBlock command
          const event = new CustomEvent('ray:slash-command', {
            detail: { command: 'codeBlock' },
          });
          editor.editorElement.dispatchEvent(event);
        },
      },
      {
        name: 'Table',
        icon: '⊞',
        description: 'Insert a simple table',
        action: () => {
          const event = new CustomEvent('ray:slash-command', {
            detail: { command: 'table' },
          });
          editor.editorElement.dispatchEvent(event);
        },
      },
      {
        name: 'Horizontal Rule',
        icon: '—',
        description: 'Visual divider line',
        action: () => {
          const event = new CustomEvent('ray:slash-command', {
            detail: { command: 'hr' },
          });
          editor.editorElement.dispatchEvent(event);
        },
      },
    ];

    defaults.forEach(cmd => this.registerCommand(cmd));
  }

  private bindEvents(): void {
    this.editorArea.addEventListener('keydown', e => {
      if (!this.palette) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
          this.renderPalette();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectedIndex =
            (this.selectedIndex - 1 + this.filteredCommands.length) %
            this.filteredCommands.length;
          this.renderPalette();
          break;
        case 'Enter':
          e.preventDefault();
          this.executeSelected();
          break;
        case 'Escape':
          this.hidePalette();
          break;
      }
    });

    this.editorArea.addEventListener('input', () => {
      this.handleInput();
    });

    // Close on click outside
    document.addEventListener('click', e => {
      if (this.palette && !this.palette.contains(e.target as Node)) {
        this.hidePalette();
      }
    });
  }

  private handleInput(): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE) {
      this.hidePalette();
      return;
    }

    const text = node.textContent || '';
    const offset = range.startOffset;
    const textBefore = text.slice(0, offset);

    // Look for "/" trigger at start or after whitespace
    const slashMatch = textBefore.match(/(?:^|\n)(\/(\w*))$/);
    if (!slashMatch) {
      this.hidePalette();
      return;
    }

    this.query = slashMatch[2] || '';
    this.triggerRange = range.cloneRange();

    // Move trigger range back to the slash
    this.triggerRange.setStart(node, offset - slashMatch[1].length);
    this.triggerRange.setEnd(node, offset);

    this.filteredCommands = this.query
      ? this.commands.filter(cmd =>
          cmd.name.toLowerCase().includes(this.query.toLowerCase())
        )
      : this.commands;

    if (this.filteredCommands.length === 0) {
      this.hidePalette();
      return;
    }

    this.selectedIndex = 0;
    this.showPalette(range);
  }

  private showPalette(range: Range): void {
    if (!this.palette) {
      this.palette = document.createElement('div');
      this.palette.className = 'ray-slash-palette';
      document.body.appendChild(this.palette);
    }

    // Position below the caret
    const rect = range.getBoundingClientRect();
    this.palette.style.position = 'fixed';
    this.palette.style.left = `${rect.left}px`;
    this.palette.style.top = `${rect.bottom + 4}px`;
    this.palette.style.zIndex = '99999';

    this.renderPalette();
  }

  private renderPalette(): void {
    if (!this.palette) return;

    this.palette.innerHTML = '';

    this.filteredCommands.forEach((cmd, i) => {
      const item = document.createElement('div');
      item.className = `ray-slash-item${i === this.selectedIndex ? ' ray-slash-item-active' : ''}`;
      item.innerHTML = `
        <span class="ray-slash-icon">${escapeHtml(cmd.icon)}</span>
        <span class="ray-slash-info">
          <span class="ray-slash-name">${escapeHtml(cmd.name)}</span>
          ${cmd.description ? `<span class="ray-slash-desc">${escapeHtml(cmd.description)}</span>` : ''}
        </span>
      `;
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        this.selectedIndex = i;
        this.executeSelected();
      });
      this.palette!.appendChild(item);
    });
  }

  private executeSelected(): void {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (!cmd) return;

    // Delete the slash + query text
    if (this.triggerRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.triggerRange);
      this.triggerRange.deleteContents();
    }

    this.hidePalette();
    cmd.action(null as any); // editor instance passed in registerDefaultCommands
    this.editorArea.focus();
  }

  private hidePalette(): void {
    this.palette?.remove();
    this.palette = null;
    this.query = '';
    this.triggerRange = null;
  }

  destroy(): void {
    this.hidePalette();
  }
}
