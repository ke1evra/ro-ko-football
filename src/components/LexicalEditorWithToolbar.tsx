'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { 
  $getRoot, 
  $getSelection, 
  EditorState, 
  LexicalEditor,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode
} from 'lexical'
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

import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { $setBlocksType } from '@lexical/selection'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
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

// Тулбар
function LexicalToolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
    }
  }, [])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      1
    )
  }, [editor, updateToolbar])

  const formatText = (format: string) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize))
      }
    })
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const insertList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
      {/* Форматирование текста */}
      <Button
        variant={isBold ? 'default' : 'ghost'}
        size="sm"
        onClick={() => formatText('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={isItalic ? 'default' : 'ghost'}
        size="sm"
        onClick={() => formatText('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={isUnderline ? 'default' : 'ghost'}
        size="sm"
        onClick={() => formatText('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant={isStrikethrough ? 'default' : 'ghost'}
        size="sm"
        onClick={() => formatText('strikethrough')}
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Заголовки */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatHeading('h1')}
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatHeading('h2')}
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatHeading('h3')}
        className="h-8 w-8 p-0"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Списки */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertList('bullet')}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertList('number')}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Цитата */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createQuoteNode())
            }
          })
        }}
        className="h-8 w-8 p-0"
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface LexicalEditorWithToolbarProps {
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
  paragraph: 'mb-2 leading-relaxed',
  quote: 'border-l-4 border-muted pl-4 italic text-muted-foreground mb-4',
  heading: {
    h1: 'text-2xl font-bold mb-3 mt-4',
    h2: 'text-xl font-semibold mb-2 mt-3',
    h3: 'text-lg font-medium mb-2 mt-2',
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
}

function onError(error: Error) {
  console.error('Lexical Editor Error:', error)
}

export default function LexicalEditorWithToolbar({
  value,
  onChange,
  placeholder = 'Введите текст...',
  className,
  autoFocus = false,
}: LexicalEditorWithToolbarProps) {
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
    <div className={cn('relative border rounded-md overflow-hidden', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <LexicalToolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[150px] resize-none text-sm outline-none p-3 focus:ring-0"
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