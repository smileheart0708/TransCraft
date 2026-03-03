import { EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'

type CodeEditorCallbacks = {
  onChange: (content: string) => void
  onSaveShortcut: () => void
}

function createEditorTheme(): Extension {
  return EditorView.theme({
    '&': {
      height: '100%',
      color: 'rgb(var(--ui-text))',
      backgroundColor: 'rgb(var(--ui-surface))'
    },
    '.cm-content': {
      caretColor: 'rgb(var(--ui-brand))',
      fontFamily:
        "'Iosevka Custom', 'JetBrains Mono', 'Fira Code', 'Cascadia Mono', 'Consolas', monospace",
      fontSize: '13px',
      lineHeight: '1.6'
    },
    '.cm-gutters': {
      backgroundColor: 'rgb(var(--ui-surface-muted))',
      color: 'rgb(var(--ui-text-muted))',
      borderRight: '1px solid rgb(var(--ui-border))'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgb(var(--ui-surface-muted) / 0.7)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgb(var(--ui-surface-muted))'
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'rgb(var(--ui-brand-emphasis))'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgb(var(--ui-brand) / 0.28)'
    }
  })
}

function createExtensions(callbacks: CodeEditorCallbacks): Extension[] {
  return [
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          callbacks.onSaveShortcut()
          return true
        }
      },
      indentWithTab,
      ...defaultKeymap,
      ...historyKeymap
    ]),
    createEditorTheme(),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      callbacks.onChange(update.state.doc.toString())
    })
  ]
}

export class CodeEditorService {
  private editorView: EditorView | null = null
  private readonly callbacks: CodeEditorCallbacks
  private suppressOnChange = false

  constructor(callbacks: CodeEditorCallbacks) {
    this.callbacks = callbacks
  }

  mount(container: HTMLElement, content: string): void {
    this.destroy()

    const startState = EditorState.create({
      doc: content,
      extensions: createExtensions({
        onChange: (nextContent) => {
          if (this.suppressOnChange) return
          this.callbacks.onChange(nextContent)
        },
        onSaveShortcut: this.callbacks.onSaveShortcut
      })
    })

    this.editorView = new EditorView({
      state: startState,
      parent: container
    })
  }

  setContent(content: string): void {
    if (!this.editorView) return

    const currentContent = this.editorView.state.doc.toString()
    if (currentContent === content) return

    this.suppressOnChange = true
    this.editorView.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: content
      }
    })
    this.suppressOnChange = false
  }

  focus(): void {
    this.editorView?.focus()
  }

  destroy(): void {
    if (!this.editorView) return
    this.editorView.destroy()
    this.editorView = null
  }
}
