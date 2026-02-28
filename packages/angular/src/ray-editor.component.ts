import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { RayEditorOptions } from 'ray-editor';

/**
 * Angular component for RayEditor.
 *
 * @example
 * ```html
 * <!-- Template-driven -->
 * <ray-editor [(ngModel)]="content" [options]="editorOptions"></ray-editor>
 *
 * <!-- Reactive forms -->
 * <ray-editor formControlName="body" [options]="editorOptions"></ray-editor>
 * ```
 */
@Component({
  selector: 'ray-editor',
  template: '<div #container></div>',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RayEditorAngularComponent),
      multi: true,
    },
  ],
  standalone: true,
})
export class RayEditorAngularComponent
  implements ControlValueAccessor, OnInit, OnDestroy, OnChanges
{
  @Input() options: RayEditorOptions = {};
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private editor: any = null;
  private onChangeFn: (value: string) => void = () => {};
  private onTouchedFn: () => void = () => {};
  private pendingValue: string | null = null;

  async ngOnInit(): Promise<void> {
    const { RayEditor } = await import('ray-editor');

    const id = `ray-angular-${Math.random().toString(36).slice(2)}`;
    this.containerRef.nativeElement.id = id;

    this.editor = new RayEditor(id, {
      ...this.options,
      onChange: (html: string) => {
        this.onChangeFn(html);
        this.onTouchedFn();
        this.contentChange.emit(html);
      },
    });

    if (this.pendingValue !== null) {
      this.editor.setContent(this.pendingValue);
      this.pendingValue = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.editor) {
      // For runtime option changes, apply what we can
      if (changes['options'].currentValue?.theme) {
        this.editor.setTheme(changes['options'].currentValue.theme);
      }
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  // ControlValueAccessor
  writeValue(html: string): void {
    if (!this.editor) {
      this.pendingValue = html;
      return;
    }
    const current = this.editor.getContent();
    if (current !== html) {
      this.editor.setContent(html ?? '');
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.editor?.setReadOnly(isDisabled);
  }
}
