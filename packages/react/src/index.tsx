import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { RayEditorOptions, RayEditorInstance } from 'ray-editor';

export interface RayEditorProps {
  /** Initial HTML content */
  value?: string;
  /** Fired on every content change — receives cleaned HTML */
  onChange?: (html: string) => void;
  /** RayEditor options (toolbar, theme, plugins, etc.) */
  options?: RayEditorOptions;
  /** Class name for the wrapper div */
  className?: string;
  /** Inline styles for the wrapper div */
  style?: React.CSSProperties;
}

export interface RayEditorRef {
  /** Get current editor HTML content */
  getContent(): string;
  /** Set editor HTML content */
  setContent(html: string): void;
  /** Access the raw RayEditor instance */
  editor: RayEditorInstance | null;
}

/**
 * RayEditor React component.
 *
 * @example
 * ```tsx
 * import { RayEditorComponent } from '@ray-editor/react';
 * import 'ray-editor/css';
 *
 * function App() {
 *   const [html, setHtml] = React.useState('');
 *   return (
 *     <RayEditorComponent
 *       value={html}
 *       onChange={setHtml}
 *       options={{ theme: 'light', wordCount: true }}
 *     />
 *   );
 * }
 * ```
 */
export const RayEditorComponent = forwardRef<RayEditorRef, RayEditorProps>(
  ({ value, onChange, options = {}, className, style }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<import('ray-editor').RayEditor | null>(null);
    // Keep a stable reference to onChange to avoid re-creating editor
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      getContent: () => editorRef.current?.getContent() ?? '',
      setContent: (html: string) => editorRef.current?.setContent(html),
      get editor() {
        return editorRef.current as unknown as RayEditorInstance;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      // Dynamically import to avoid SSR issues
      let cancelled = false;

      import('ray-editor').then(({ RayEditor }) => {
        if (cancelled || !containerRef.current) return;

        // Create a unique ID for the container
        const id = `ray-react-${Math.random().toString(36).slice(2)}`;
        containerRef.current.id = id;

        editorRef.current = new RayEditor(id, {
          ...options,
          onChange: (html: string) => onChangeRef.current?.(html),
        });
      });

      return () => {
        cancelled = true;
        editorRef.current?.destroy();
        editorRef.current = null;
      };
      // options is intentionally excluded — re-creating editor on option change
      // is expensive. Use editor.setTheme / editor.setReadOnly for runtime changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync value prop → editor content (controlled mode)
    useEffect(() => {
      if (value !== undefined && editorRef.current) {
        const current = editorRef.current.getContent();
        if (current !== value) {
          editorRef.current.setContent(value);
        }
      }
    }, [value]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={style}
      />
    );
  }
);

RayEditorComponent.displayName = 'RayEditorComponent';

export default RayEditorComponent;
