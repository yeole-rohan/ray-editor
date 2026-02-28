import { SelectionManager } from '../core/selection';

/**
 * Table insertion and context menu.
 */
export class TableFeature {
  private editorArea: HTMLElement;
  private selectionManager: SelectionManager;

  constructor(editorArea: HTMLElement, selectionManager: SelectionManager) {
    this.editorArea = editorArea;
    this.selectionManager = selectionManager;
  }

  openTableModal(): void {
    const savedRange = this.selectionManager.save();

    const modal = document.createElement('div');
    modal.className = 'ray-editor-table-modal';
    modal.innerHTML = `
      <div class="ray-editor-table-modal-content">
        <h3 style="margin:0 0 12px;font-size:16px;">Insert Table</h3>
        <label>Rows <input type="number" id="ray-table-rows" min="1" value="2" /></label>
        <label>Columns <input type="number" id="ray-table-cols" min="1" value="2" /></label>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button id="ray-insert-table">Insert Table</button>
          <button id="ray-cancel-table">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#ray-insert-table')!.addEventListener('click', () => {
      const rows = parseInt(
        (modal.querySelector<HTMLInputElement>('#ray-table-rows')!).value
      );
      const cols = parseInt(
        (modal.querySelector<HTMLInputElement>('#ray-table-cols')!).value
      );
      this.selectionManager.restore(savedRange);
      this.insertTable(rows, cols);
      modal.remove();
    });

    modal.querySelector('#ray-cancel-table')!.addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  private insertTable(rows: number, cols: number): void {
    const table = document.createElement('table');
    table.className = 'ray-editor-table';

    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    if (range) {
      range.deleteContents();
      range.insertNode(table);
    } else {
      this.editorArea.appendChild(table);
    }

    // Attach context menu
    table.addEventListener('contextmenu', e => {
      e.preventDefault();
      const td = (e.target as HTMLElement).closest('td');
      if (!td) return;
      this.showContextMenu(td as HTMLTableCellElement, e.pageX, e.pageY);
    });

    // Table highlight on click
    table.addEventListener('click', () => {
      document.querySelectorAll('.ray-editor-table-highlighted').forEach(t =>
        t.classList.remove('ray-editor-table-highlighted')
      );
      table.classList.add('ray-editor-table-highlighted');
    });

    // Paragraph after table
    const newLine = document.createElement('p');
    newLine.innerHTML = '<br>';
    table.after(newLine);

    const newRange = document.createRange();
    newRange.setStart(newLine, 0);
    newRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(newRange);
  }

  private showContextMenu(td: HTMLTableCellElement, x: number, y: number): void {
    document.getElementById('ray-table-context-menu')?.remove();

    const menu = document.createElement('div');
    menu.id = 'ray-table-context-menu';
    menu.className = 'ray-table-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
      <button data-action="add-row">Add Row Below</button>
      <button data-action="delete-row">Delete Row</button>
      <button data-action="add-col">Add Column Right</button>
      <button data-action="delete-col">Delete Column</button>
      <button data-action="remove-table">Remove Table</button>
    `;

    document.body.appendChild(menu);

    const tr = td.parentElement as HTMLTableRowElement;
    const table = td.closest('table') as HTMLTableElement;
    const cellIndex = Array.from(td.parentNode!.children).indexOf(td);

    menu.addEventListener('click', e => {
      const action = (e.target as HTMLElement).dataset.action;
      if (!action) return;

      switch (action) {
        case 'add-row': {
          const newRow = tr.cloneNode(true) as HTMLTableRowElement;
          newRow.querySelectorAll('td').forEach(cell => (cell.innerHTML = '&nbsp;'));
          tr.after(newRow);
          break;
        }
        case 'delete-row':
          if (table.rows.length > 1) tr.remove();
          break;
        case 'add-col':
          Array.from(table.rows).forEach(row => {
            const cell = row.insertCell(cellIndex + 1);
            cell.innerHTML = '&nbsp;';
          });
          break;
        case 'delete-col':
          if (table.rows[0].cells.length > 1) {
            Array.from(table.rows).forEach(row => row.deleteCell(cellIndex));
          }
          break;
        case 'remove-table':
          table.remove();
          break;
      }
      menu.remove();
    });

    document.addEventListener('click', () => menu.remove(), { once: true });
  }
}
