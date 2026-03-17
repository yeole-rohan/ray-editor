import { SelectionManager } from '../core/selection';

/**
 * Table insertion, grid picker, floating context toolbar, and keyboard navigation.
 */
export class TableFeature {
  private editorArea: HTMLElement;
  private selectionManager: SelectionManager;
  private picker: HTMLElement | null = null;
  private contextToolbar: HTMLElement | null = null;
  private activeCell: HTMLTableCellElement | null = null;

  constructor(editorArea: HTMLElement, selectionManager: SelectionManager) {
    this.editorArea = editorArea;
    this.selectionManager = selectionManager;
  }

  // ── Grid Picker ─────────────────────────────────────────────────────────────

  showTablePicker(anchorBtn: HTMLElement): void {
    this.hidePicker();

    const ROWS = 8;
    const COLS = 8;

    const picker = document.createElement('div');
    picker.className = 'ray-table-picker';
    this.picker = picker;

    const label = document.createElement('div');
    label.className = 'ray-table-picker-label';
    label.textContent = 'Insert Table';

    const grid = document.createElement('div');
    grid.className = 'ray-table-picker-grid';
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

    const cells: HTMLElement[] = [];

    const highlight = (r: number, c: number) => {
      cells.forEach((cell, i) => {
        const cr = Math.floor(i / COLS);
        const cc = i % COLS;
        cell.classList.toggle('active', cr <= r && cc <= c);
      });
      label.textContent = `${r + 1} × ${c + 1}`;
    };

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'ray-table-picker-cell';
        cell.addEventListener('mouseover', () => highlight(r, c));
        cell.addEventListener('click', () => {
          this.hidePicker();
          this.insertTable(r + 1, c + 1);
        });
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    picker.appendChild(label);
    picker.appendChild(grid);
    document.body.appendChild(picker);

    // Position below the anchor button
    const rect = anchorBtn.getBoundingClientRect();
    picker.style.top = `${rect.bottom + window.scrollY + 4}px`;
    picker.style.left = `${rect.left + window.scrollX}px`;

    // Close on outside click
    const onOutside = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        this.hidePicker();
        document.removeEventListener('mousedown', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
  }

  private hidePicker(): void {
    this.picker?.remove();
    this.picker = null;
  }

  // ── Table Insertion ──────────────────────────────────────────────────────────

  insertTable(rows: number, cols: number): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'ray-table-wrapper';

    const table = document.createElement('table');

    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '<br>';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);

    const sel = window.getSelection();
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(wrapper);
      // Move range after the inserted wrapper
      range.setStartAfter(wrapper);
      range.collapse(true);
    } else {
      this.editorArea.appendChild(wrapper);
    }

    // Paragraph after table so user can exit
    const newLine = document.createElement('p');
    newLine.innerHTML = '<br>';
    wrapper.after(newLine);

    // Place cursor in first cell
    const firstCell = table.querySelector('td');
    if (firstCell) {
      const r = document.createRange();
      r.selectNodeContents(firstCell);
      r.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }

    this.initResizeHandles(table);
  }

  // ── Floating Context Toolbar ─────────────────────────────────────────────────

  showContextToolbar(cell: HTMLTableCellElement): void {
    if (this.activeCell === cell && this.contextToolbar) return;
    this.hideContextToolbar();   // clears activeCell — must come BEFORE setting it
    this.activeCell = cell;

    const toolbar = document.createElement('div');
    toolbar.className = 'ray-table-context-toolbar';
    this.contextToolbar = toolbar;

    const actions: Array<{ label: string; title: string; action: () => void }> = [
      { label: '↑ Row', title: 'Insert row above', action: () => this.insertRowAbove() },
      { label: '↓ Row', title: 'Insert row below', action: () => this.insertRowBelow() },
      { label: '← Col', title: 'Insert column left', action: () => this.insertColumnLeft() },
      { label: '→ Col', title: 'Insert column right', action: () => this.insertColumnRight() },
      { label: '↕ Up', title: 'Move row up', action: () => this.moveRowUp() },
      { label: '↕ Dn', title: 'Move row down', action: () => this.moveRowDown() },
      { label: 'TH', title: 'Toggle header row', action: () => this.toggleHeaderRow() },
      { label: '✕ Row', title: 'Delete row', action: () => this.deleteRow() },
      { label: '✕ Col', title: 'Delete column', action: () => this.deleteColumn() },
      { label: '🗑', title: 'Delete table', action: () => this.deleteTable() },
    ];

    actions.forEach(({ label, title, action }) => {
      const btn = document.createElement('button');
      btn.className = 'ray-table-ctx-btn';
      btn.textContent = label;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.onmousedown = (e) => {
        e.preventDefault();
        action();
        this.repositionContextToolbar();
      };
      toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);

    // Highlight TH button if current row is already a header row
    const tr = cell.closest('tr');
    if (tr) {
      const isHeaderRow = Array.from((tr as HTMLTableRowElement).cells)
        .every(c => c.tagName.toLowerCase() === 'th');
      const thBtn = toolbar.querySelector<HTMLButtonElement>('[title="Toggle header row"]');
      if (thBtn && isHeaderRow) thBtn.classList.add('active');
    }

    // Wait for layout so offsetHeight/offsetWidth are accurate
    requestAnimationFrame(() => this.repositionContextToolbar());
  }

  repositionContextToolbar(): void {
    if (!this.contextToolbar || !this.activeCell) return;
    const table = this.activeCell.closest('table');
    if (!table) { this.hideContextToolbar(); return; }

    const rect = table.getBoundingClientRect();
    const tbHeight = this.contextToolbar.offsetHeight || 36;
    const spaceAbove = rect.top;
    let top: number;

    if (spaceAbove >= tbHeight + 8) {
      // Preferred: above the table
      top = rect.top + window.scrollY - tbHeight - 6;
    } else {
      // Fallback: below the table
      top = rect.bottom + window.scrollY + 6;
    }

    // Clamp left so the toolbar stays within the viewport
    let left = rect.left + window.scrollX;
    const tbWidth = this.contextToolbar.offsetWidth || 400;
    if (left + tbWidth > window.innerWidth - 8) {
      left = Math.max(8 + window.scrollX, window.innerWidth - tbWidth - 8 + window.scrollX);
    }

    this.contextToolbar.style.top = `${top}px`;
    this.contextToolbar.style.left = `${left}px`;
  }

  hideContextToolbar(): void {
    this.contextToolbar?.remove();
    this.contextToolbar = null;
    this.activeCell = null;
  }

  // ── Row / Column Operations ──────────────────────────────────────────────────

  private getActiveCell(): HTMLTableCellElement | null {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return this.activeCell;
    const node = sel.anchorNode;
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    return (el?.closest('td') ?? el?.closest('th') ?? this.activeCell) as HTMLTableCellElement | null;
  }

  insertRowAbove(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    if (!tr) return;
    const cols = tr.cells.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement('td');
      cell.innerHTML = '<br>';
      newRow.appendChild(cell);
    }
    tr.parentNode?.insertBefore(newRow, tr);
  }

  insertRowBelow(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    if (!tr) return;
    const cols = tr.cells.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement('td');
      cell.innerHTML = '<br>';
      newRow.appendChild(cell);
    }
    tr.after(newRow);
  }

  insertColumnLeft(): void {
    const td = this.getActiveCell();
    const table = td?.closest('table');
    if (!td || !table) return;
    const colIndex = Array.from((td.parentElement as HTMLTableRowElement).cells).indexOf(td);
    Array.from(table.rows).forEach(row => {
      const cell = document.createElement('td');
      cell.innerHTML = '<br>';
      row.insertBefore(cell, row.cells[colIndex] ?? null);
    });
  }

  insertColumnRight(): void {
    const td = this.getActiveCell();
    const table = td?.closest('table');
    if (!td || !table) return;
    const colIndex = Array.from((td.parentElement as HTMLTableRowElement).cells).indexOf(td);
    Array.from(table.rows).forEach(row => {
      const cell = document.createElement('td');
      cell.innerHTML = '<br>';
      const ref = row.cells[colIndex + 1] ?? null;
      row.insertBefore(cell, ref);
    });
  }

  deleteRow(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    const table = tr?.closest('table');
    if (!tr || !table) return;
    if (table.rows.length <= 1) { this.deleteTable(); return; }
    const nextRow = (tr.nextElementSibling ?? tr.previousElementSibling) as HTMLTableRowElement | null;
    tr.remove();
    if (nextRow?.cells[0]) this.focusCell(nextRow.cells[0] as HTMLTableCellElement);
  }

  moveRowUp(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    if (!tr) return;
    const prevRow = tr.previousElementSibling as HTMLTableRowElement | null;
    if (prevRow) tr.parentNode?.insertBefore(tr, prevRow);
  }

  moveRowDown(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    if (!tr) return;
    const nextRow = tr.nextElementSibling as HTMLTableRowElement | null;
    if (nextRow) tr.parentNode?.insertBefore(nextRow, tr);
  }

  toggleHeaderRow(): void {
    const td = this.getActiveCell();
    const tr = td?.closest('tr');
    if (!tr) return;
    const isHeader = Array.from(tr.cells).every(c => c.tagName.toLowerCase() === 'th');
    Array.from(tr.cells).forEach(cell => {
      const newCell = document.createElement(isHeader ? 'td' : 'th');
      newCell.innerHTML = cell.innerHTML;
      tr.replaceChild(newCell, cell);
    });
  }

  deleteColumn(): void {
    const td = this.getActiveCell();
    const table = td?.closest('table');
    if (!td || !table) return;
    const colIndex = Array.from((td.parentElement as HTMLTableRowElement).cells).indexOf(td);
    if (table.rows[0]?.cells.length <= 1) { this.deleteTable(); return; }
    Array.from(table.rows).forEach(row => {
      if (row.cells[colIndex]) row.deleteCell(colIndex);
    });
  }

  deleteTable(): void {
    const td = this.getActiveCell();
    const wrapper = td?.closest('.ray-table-wrapper') ?? td?.closest('table');
    if (!wrapper) return;
    const newPara = document.createElement('p');
    newPara.innerHTML = '<br>';
    wrapper.parentNode?.insertBefore(newPara, wrapper);
    wrapper.remove();
    this.hideContextToolbar();
    const r = document.createRange();
    r.selectNodeContents(newPara);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  private focusCell(cell: HTMLTableCellElement): void {
    const r = document.createRange();
    r.selectNodeContents(cell);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  // ── Column + Row Resize with visual indicators ────────────────────────────────

  initResizeHandles(table: HTMLTableElement): void {
    const MIN_COL_WIDTH = 40;
    const MIN_ROW_HEIGHT = 30;

    let colDragCell: HTMLTableCellElement | null = null;
    let colDragStartX = 0;
    let colDragStartWidth = 0;
    let colDragIndex = -1;

    let rowDragRow: HTMLTableRowElement | null = null;
    let rowDragStartY = 0;
    let rowDragStartHeight = 0;

    let highlightCell: HTMLTableCellElement | null = null;
    let highlightRow: HTMLTableRowElement | null = null;

    const isNearRightEdge = (cell: HTMLTableCellElement, clientX: number): boolean => {
      const rect = cell.getBoundingClientRect();
      return clientX >= rect.right - 5 && clientX <= rect.right + 5;
    };

    const isNearBottomEdge = (row: HTMLTableRowElement, clientY: number): boolean => {
      const rect = row.getBoundingClientRect();
      return clientY >= rect.bottom - 5 && clientY <= rect.bottom + 5;
    };

    table.addEventListener('mousemove', (e: MouseEvent) => {
      if (colDragCell || rowDragRow) return;

      const cell = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement | null;
      const row = (e.target as HTMLElement).closest('tr') as HTMLTableRowElement | null;

      // Clear stale highlights
      if (highlightCell && highlightCell !== cell) {
        highlightCell.classList.remove('ray-col-resize-active');
        highlightCell = null;
      }
      if (highlightRow && highlightRow !== row) {
        highlightRow.classList.remove('ray-row-resize-active');
        highlightRow = null;
      }

      let cursor = '';

      if (cell && isNearRightEdge(cell, e.clientX)) {
        cursor = 'col-resize';
        cell.classList.add('ray-col-resize-active');
        highlightCell = cell;
      } else if (cell) {
        cell.classList.remove('ray-col-resize-active');
      }

      if (row && isNearBottomEdge(row, e.clientY)) {
        cursor = cursor || 'row-resize';
        row.classList.add('ray-row-resize-active');
        highlightRow = row;
      } else if (row) {
        row.classList.remove('ray-row-resize-active');
      }

      table.style.cursor = cursor;
    });

    table.addEventListener('mouseleave', () => {
      if (!colDragCell && !rowDragRow) {
        table.style.cursor = '';
        highlightCell?.classList.remove('ray-col-resize-active');
        highlightCell = null;
        highlightRow?.classList.remove('ray-row-resize-active');
        highlightRow = null;
      }
    });

    table.addEventListener('mousedown', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement | null;
      const row = (e.target as HTMLElement).closest('tr') as HTMLTableRowElement | null;

      // Column resize takes priority when near right edge
      if (cell && isNearRightEdge(cell, e.clientX)) {
        e.preventDefault();
        colDragCell = cell;
        colDragStartX = e.clientX;
        colDragStartWidth = cell.offsetWidth;
        colDragIndex = cell.cellIndex;

        const onMove = (ev: MouseEvent) => {
          if (!colDragCell) return;
          const newWidth = Math.max(MIN_COL_WIDTH, colDragStartWidth + ev.clientX - colDragStartX);
          Array.from(table.rows).forEach(r => {
            const c = r.cells[colDragIndex] as HTMLTableCellElement | undefined;
            if (c) c.style.width = `${newWidth}px`;
          });
        };
        const onUp = () => {
          colDragCell = null;
          colDragIndex = -1;
          table.style.cursor = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return;
      }

      // Row resize when near bottom edge
      if (row && isNearBottomEdge(row, e.clientY)) {
        e.preventDefault();
        rowDragRow = row;
        rowDragStartY = e.clientY;
        rowDragStartHeight = row.offsetHeight;

        const onMove = (ev: MouseEvent) => {
          if (!rowDragRow) return;
          const newHeight = Math.max(MIN_ROW_HEIGHT, rowDragStartHeight + ev.clientY - rowDragStartY);
          rowDragRow.style.height = `${newHeight}px`;
        };
        const onUp = () => {
          rowDragRow?.classList.remove('ray-row-resize-active');
          rowDragRow = null;
          table.style.cursor = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      }
    });
  }

  // ── Tab Key Navigation ────────────────────────────────────────────────────────

  handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const node = sel.anchorNode;
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    const td = el?.closest('td') ?? el?.closest('th');
    if (!td) return;

    e.preventDefault();
    const table = td.closest('table') as HTMLTableElement;
    const cells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
    const idx = cells.indexOf(td as HTMLTableCellElement);

    if (!e.shiftKey) {
      if (idx < cells.length - 1) {
        this.focusCell(cells[idx + 1]);
      } else {
        // Add new row
        this.activeCell = td as HTMLTableCellElement;
        this.insertRowBelow();
        const newCells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
        this.focusCell(newCells[idx + 1]);
      }
    } else {
      if (idx > 0) this.focusCell(cells[idx - 1]);
    }
  }
}
