'use client'

import { useEffect, useRef } from 'react'
import { $getRoot, $getSelection, EditorState, LexicalEditor } from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'

import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'

import { cn } from '@/lib/utils'

// Плагин для обновления значения
function OnChangeValuePlugin({ onChange }: { onChange: (value: any) => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      onChange(editorState.toJSON())
    })
  }, [editor, onChange])

  return null
}

// Плагин для установки начального значения
function InitialValuePlugin({ initialValue }: { initialValue?: any }) {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current && initialValue) {
      isFirstRender.current = false
      editor.update(() => {
        const editorState = editor.parseEditorState(initialValue)
        editor.setEditorState(editorState)
      })
    }
  }, [editor, initialValue])

  return null
}

interface LexicalEditorProps {
  value?: any
  onChange: (value: any) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'text-muted-foreground',
  paragraph: 'mb-2',
  quote: 'border-l-4 border-muted pl-4 italic text-muted-foreground mb-4',
  heading: {
    h1: 'text-2xl font-bold mb-2',
    h2: 'text-xl font-semibold mb-2',
    h3: 'text-lg font-medium mb-2',
    h4: 'text-base font-medium mb-2',
    h5: 'text-sm font-medium mb-2',
    h6: 'text-xs font-medium mb-2',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal mb-2 pl-6',
    ul: 'list-disc mb-2 pl-6',
    listitem: 'mb-1',
  },
  image: 'editor-image',
  link: 'text-primary underline hover:text-primary/80',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-muted px-1 py-0.5 rounded text-sm font-mono',
  },
  code: 'bg-muted p-2 rounded font-mono text-sm mb-2',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
}

function onError(error: Error) {
  console.error('Lexical Editor Error:', error)
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  className,
  autoFocus = false,
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode,
    ],
  }

  return (
    <div className={cn('relative', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[150px] resize-none text-sm outline-none p-3 border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder={placeholder}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-muted-foreground text-sm pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangeValuePlugin onChange={onChange} />
          {value && <InitialValuePlugin initialValue={value} />}
          <HistoryPlugin />
          {autoFocus && <AutoFocusPlugin />}
          <LinkPlugin />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </div>
      </LexicalComposer>
    </div>
  )
}