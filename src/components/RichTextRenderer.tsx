import React from 'react'
import LexicalRenderer from './LexicalRenderer'
import type { TypedEditorState } from '@payloadcms/richtext-lexical'

interface RichTextRendererProps {
  value: TypedEditorState | any
}

function RichTextRenderer({ value }: RichTextRendererProps) {
  const root = value?.root || value
  const nodes: any[] = Array.isArray(root) ? root : root?.children || []
  if (!nodes || nodes.length === 0) return null
  return <LexicalRenderer nodes={nodes} rootNodes={nodes} />
}

export default RichTextRenderer
