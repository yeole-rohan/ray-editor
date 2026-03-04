import type { ToolbarGroup, ToolbarItem, RayEditorOptions } from '../types/options';
import { BUTTON_CONFIGS, type ButtonConfigMap } from '../features/button-configs';

export interface ToolbarButtonConfig {
  keyname: string;
  label: string;
  cmd?: string;
  value?: string;
  dropdown?: boolean;
  options?: Record<string, { label: string; cmd: string; value: string }>;
  handler?: () => void;
}

export class ToolbarManager {
  private toolbar: HTMLElement;
  private editorArea: HTMLElement;
  private options: RayEditorOptions;
  private commandDispatch: (keyname: string) => void;

  // Overflow menu state
  private resizeObserver?: ResizeObserver;
  private lastToolbarWidth?: number;
  private resizeTimeout?: ReturnType<typeof setTimeout>;
  private overflowMode = false;

  constructor(
    toolbar: HTMLElement,
    editorArea: HTMLElement,
    options: RayEditorOptions,
    commandDispatch: (keyname: string) => void
  ) {
    this.toolbar = toolbar;
    this.editorArea = editorArea;
    this.options = options;
    this.commandDispatch = commandDispatch;
  }

  build(groups: ToolbarGroup[]): void {
    this.toolbar.innerHTML = '';

    const allConfigs = BUTTON_CONFIGS;

    groups.forEach((group, gi) => {
      // Group wrapper
      const groupEl = document.createElement('div');
      groupEl.className = 'ray-toolbar-group';
      groupEl.setAttribute('data-group', String(gi));

      group.forEach(key => {
        const config = allConfigs[key as keyof ButtonConfigMap] as any;
        if (!config) return;

        // Check if the feature is configured (for upload features)
        if (key === 'imageUpload' && !this.hasImageUpload()) return;
        if (key === 'fileUpload' && !this.hasFileUpload()) return;

        if (config.dropdown && config.dropdownOptions) {
          groupEl.appendChild(this.createDropdown(key, config));
        } else {
          groupEl.appendChild(this.createButton(key, config));
        }
      });

      if (groupEl.children.length > 0) {
        this.toolbar.appendChild(groupEl);
      }
    });

    if (this.options.overflowMenu) {
      this.setupOverflowMenu();
    }
  }

  private createButton(key: string, config: any): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    const title = this.formatTitle(key);
    btn.title = title;
    btn.setAttribute('data-tooltip', title);
    btn.innerHTML = config.label;
    btn.className = `ray-btn ray-btn-${key}`;

    btn.addEventListener('click', () => {
      this.commandDispatch(key);
    });

    return btn;
  }

  private createDropdown(key: string, config: any): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = `ray-dropdown ray-dropdown-${key}`;
    select.title = this.formatTitle(key);

    Object.entries(config.dropdownOptions).forEach(([, opt]: [string, any]) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const selectedOpt = Object.values(config.dropdownOptions).find(
        (opt: any) => opt.value === select.value
      ) as any;
      if (selectedOpt?.cmd) {
        // execCommand is dispatched via keyname with extra value
        document.execCommand(selectedOpt.cmd, false, selectedOpt.value);
        this.editorArea.focus();
      }
    });

    return select;
  }

  private formatTitle(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  updateActiveStates(): void {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const parent = sel.getRangeAt(0).startContainer.parentElement;

    // Reset all active states
    this.toolbar.querySelectorAll('.ray-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (!parent) return;

    const activeChecks: Array<{ tags: string[]; btnId: string }> = [
      { tags: ['b', 'strong'], btnId: 'ray-btn-bold' },
      { tags: ['i', 'em'], btnId: 'ray-btn-italic' },
      { tags: ['u'], btnId: 'ray-btn-underline' },
      { tags: ['s', 'strike', 'del'], btnId: 'ray-btn-strikethrough' },
      { tags: ['sub'], btnId: 'ray-btn-subscript' },
      { tags: ['sup'], btnId: 'ray-btn-superscript' },
      { tags: ['code'], btnId: 'ray-btn-codeInline' },
    ];

    activeChecks.forEach(({ tags, btnId }) => {
      const isActive = tags.some(tag => this.isInTag(parent, tag));
      if (isActive) {
        this.toolbar.querySelector(`.${btnId}`)?.classList.add('active');
      }
    });

    // Code block
    if (parent.closest('.ray-code-block')) {
      this.toolbar.querySelector('.ray-btn-codeBlock')?.classList.add('active');
    }

    // Update heading dropdown
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'];
    const matched = headings.find(tag => this.isInTag(parent, tag)) || 'p';
    const headingSelect = this.toolbar.querySelector<HTMLSelectElement>('.ray-dropdown-headings');
    if (headingSelect) headingSelect.value = `<${matched}>`;

    // Update font dropdown
    const fontSelect = this.toolbar.querySelector<HTMLSelectElement>('.ray-dropdown-fonts');
    if (fontSelect) {
      const currentFont = this.getCurrentFont(parent);
      const allFonts = Array.from(fontSelect.options).map(o => o.value);
      const matched = allFonts.find(f => currentFont.toLowerCase().includes(f.toLowerCase()))
        ?? fontSelect.options[0]?.value ?? '';
      if (matched) fontSelect.value = matched;
    }

    // Update alignment dropdown
    const alignSelect = this.toolbar.querySelector<HTMLSelectElement>('.ray-dropdown-textAlignment');
    if (alignSelect && parent) {
      alignSelect.value = parent.getAttribute('align') || 'left';
    }
  }

  private isInTag(el: Element | null, tagName: string): boolean {
    let node: Element | null = el;
    while (node && node !== document.body) {
      if (node.tagName?.toLowerCase() === tagName) return true;
      node = node.parentElement;
    }
    return false;
  }

  private getCurrentFont(el: Element | null): string {
    // Primary: queryCommandValue is most accurate for execCommand-set fonts
    try {
      const cmdFont = document.queryCommandValue('fontName');
      if (cmdFont) return cmdFont.replace(/['"]/g, '').trim();
    } catch (_) { /* ignore */ }

    // Fallback: walk computed style
    let node: Element | null = el;
    while (node && node !== document.body) {
      const font = window.getComputedStyle(node).fontFamily;
      if (font && font !== 'inherit') {
        return font.split(',')[0].replace(/['"]/g, '').trim();
      }
      node = node.parentElement;
    }
    return 'Arial';
  }

  private hasImageUpload(): boolean {
    return !!(
      this.options.imageUpload?.imageUploadUrl ||
      this.options.imageUploadUrl
    );
  }

  private hasFileUpload(): boolean {
    return !!(
      this.options.fileUpload?.fileUploadUrl ||
      this.options.fileUploadUrl
    );
  }

  private setupOverflowMenu(): void {
    const debouncedCheck = () => {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        const width = this.toolbar.offsetWidth;
        if (width !== this.lastToolbarWidth) {
          this.lastToolbarWidth = width;
          this.checkToolbarWidth();
        }
      }, 60);
    };

    this.resizeObserver = new ResizeObserver(debouncedCheck);
    this.resizeObserver.observe(this.toolbar);
    window.addEventListener('resize', debouncedCheck);
    requestAnimationFrame(() => this.checkToolbarWidth());
  }

  private checkToolbarWidth(): void {
    if (
      this.toolbar.style.display === 'none' ||
      this.toolbar.offsetParent === null
    ) return;

    // Remove existing overflow button + dropdown
    this.toolbar.querySelector('.ray-btn-overflowMenu')?.remove();
    this.toolbar.querySelector('.ray-toolbar-overflow-dropdown')?.remove();

    const toolbarStyle = getComputedStyle(this.toolbar);
    const toolbarWidth = this.toolbar.offsetWidth
      - parseFloat(toolbarStyle.paddingLeft || '0')
      - parseFloat(toolbarStyle.paddingRight || '0');

    const buttons = Array.from(
      this.toolbar.querySelectorAll<HTMLElement>('button:not(.ray-btn-overflowMenu), select')
    );

    let totalWidth = 0;
    for (const btn of buttons) {
      totalWidth += btn.offsetWidth + 10;
    }

    if (totalWidth <= toolbarWidth) {
      buttons.forEach(btn => (btn.style.display = ''));
      return;
    }

    // Measure overflow button
    const tempBtn = document.createElement('button');
    tempBtn.className = 'ray-btn ray-btn-overflowMenu';
    tempBtn.innerHTML = BUTTON_CONFIGS.overflowMenu?.label ?? '…';
    tempBtn.style.visibility = 'hidden';
    document.body.appendChild(tempBtn);
    const overflowBtnWidth = tempBtn.offsetWidth;
    document.body.removeChild(tempBtn);

    // Find cutoff index
    let accumulated = 0;
    let cutoffIdx = buttons.length;
    for (let i = 0; i < buttons.length; i++) {
      if (accumulated + buttons[i].offsetWidth > toolbarWidth - overflowBtnWidth) {
        cutoffIdx = i;
        break;
      }
      accumulated += buttons[i].offsetWidth + 10;
    }

    const overflowed = buttons.slice(cutoffIdx);
    overflowed.forEach(btn => (btn.style.display = 'none'));

    // Build overflow button + dropdown
    const overflowBtn = document.createElement('button');
    overflowBtn.type = 'button';
    overflowBtn.className = 'ray-btn ray-btn-overflowMenu';
    overflowBtn.innerHTML = BUTTON_CONFIGS.overflowMenu?.label ?? '…';
    overflowBtn.style.position = 'relative';

    const dropdown = document.createElement('div');
    dropdown.className = 'ray-toolbar-overflow-dropdown';
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: '100%',
      right: '0',
      background: '#fff',
      border: '1px solid #ccc',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'none',
      zIndex: '1000',
      minWidth: '120px',
    });

    overflowed.forEach(btn => {
      const clone = btn.cloneNode(true) as HTMLElement;
      clone.style.display = 'block';
      clone.addEventListener('click', () => {
        this.commandDispatch(btn.id.replace('ray-btn-', ''));
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(clone);
    });

    let open = false;
    overflowBtn.addEventListener('click', e => {
      e.stopPropagation();
      open = !open;
      dropdown.style.display = open ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
      if (open) {
        dropdown.style.display = 'none';
        open = false;
      }
    });

    overflowBtn.appendChild(dropdown);
    this.toolbar.appendChild(overflowBtn);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
  }
}
