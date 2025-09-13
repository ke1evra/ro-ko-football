import React, { JSX } from 'react'
import type {
  SerializedAutoLinkNode,
  SerializedBlockNode,
  SerializedHorizontalRuleNode,
  SerializedLinkNode,
  SerializedListItemNode,
  SerializedListNode,
  SerializedParagraphNode,
  SerializedQuoteNode,
  SerializedRelationshipNode,
  SerializedTextNode,
  SerializedUploadNode,
  SerializedHeadingNode,
  SerializedLineBreakNode,
} from '@payloadcms/richtext-lexical'
import BlocksRenderer, { type CMSBlock } from './BlocksRenderer'

type LexicalNode =
  | SerializedAutoLinkNode
  | SerializedBlockNode
  | SerializedHorizontalRuleNode
  | SerializedLinkNode
  | SerializedListItemNode
  | SerializedListNode
  | SerializedParagraphNode
  | SerializedQuoteNode
  | SerializedRelationshipNode
  | SerializedTextNode
  | SerializedUploadNode
  | SerializedHeadingNode
  | SerializedLineBreakNode

function hasChildren(node: LexicalNode): node is LexicalNode & { children: LexicalNode[] } {
  return Array.isArray((node as any)?.children)
}

const resolveTag = (node: LexicalNode): keyof JSX.IntrinsicElements => {
  switch (node.type) {
    case 'paragraph':
      return 'p'
    case 'heading':
      return (node.tag as any) || 'h2'
    case 'quote':
      return 'blockquote'
    case 'list':
      return node.listType === 'number' ? 'ol' : 'ul'
    case 'listitem':
      return 'li'
    case 'horizontalrule':
      return 'hr'
    default:
      return 'div'
  }
}

const getBlockClass = (node: LexicalNode): string => {
  switch (node.type) {
    case 'paragraph':
      return 'mb-2 leading-relaxed'
    case 'quote':
      return 'border-l-4 border-muted pl-4 italic text-muted-foreground mb-4'
    case 'list': {
      return node.listType === 'number' ? 'list-decimal mb-2 pl-6' : 'list-disc mb-2 pl-6'
    }
    case 'listitem': {
      const classList = ['mb-1']
      if (typeof node.checked === 'boolean') {
        classList.push('-ml-6')
      }
      if ((node.children || []).map((child: any) => child?.type).includes('list')) {
        classList.push('marker:text-transparent')
      }
      return classList.join(' ')
    }
    case 'heading':
      const headingNode = node as SerializedHeadingNode
      switch (headingNode.tag) {
        case 'h1':
          return 'text-2xl font-bold mb-2'
        case 'h2':
          return 'text-xl font-semibold mb-2'
        case 'h3':
          return 'text-lg font-medium mb-2'
        default:
          return 'font-semibold mb-2'
      }
    case 'horizontalrule':
      return 'my-6 border-t border-border'
    default:
      return ''
  }
}

function headingIdFor(node: LexicalNode, rootNodes: LexicalNode[]): string | undefined {
  const tag = (node as SerializedHeadingNode)?.tag
  if (typeof tag === 'string' && /^h[1-6]$/i.test(tag)) {
    const headings = rootNodes.filter(
      (elem: any) => typeof elem?.tag === 'string' && /^h[1-6]$/i.test(elem.tag),
    )
    const findIndex = headings.findIndex((item: any) => {
      const a = (item?.children?.[0] as any)?.text
      const b = (node?.children?.[0] as any)?.text
      return a === b
    })
    const id = `title-${findIndex}`
    return id || undefined
  }
  return undefined
}

function renderLexicalTextNode(node: SerializedTextNode): React.ReactNode {
  const format = node.format || 0
  let element: React.ReactNode = node.text || ''
  // Match Vue logic: 1=bold, 2=italic, 4=underline, 8=strikethrough
  if (format & 1) element = <b>{element}</b>
  if (format & 2) element = <i>{element}</i>
  if (format & 4) element = <u>{element}</u>
  if (format & 8) element = <s>{element}</s>
  return element
}

export default function LexicalRenderer({
  content,
  nodes,
  rootNodes,
}: {
  content?: any
  nodes?: LexicalNode[]
  rootNodes?: LexicalNode[]
}) {
  const effectiveNodes = nodes || content?.root?.children
  const effectiveRootNodes = rootNodes || effectiveNodes

  if (!effectiveNodes) {
    return null
  }

  return (
    <>
      {effectiveNodes.map((node, index) => {
        // text node
        if (node.type === 'text') {
          return <span key={index}>{renderLexicalTextNode(node)}</span>
        }

        // link node
        if (node.type === 'link') {
          const href = node.fields?.url as string | undefined
          const newTab = (node.fields?.newTab ?? true) ? '_blank' : undefined
          return (
            <a
              key={index}
              href={href}
              className="text-primary underline hover:text-primary/80"
              target={newTab}
              rel={newTab ? 'noopener noreferrer' : undefined}
            >
              {hasChildren(node) && (
                <LexicalRenderer nodes={node.children} rootNodes={effectiveRootNodes} />
              )}
            </a>
          )
        }

        // autolink node
        if (node.type === 'autolink') {
          const href = node.fields?.url as string | undefined
          return (
            <a
              key={index}
              href={href}
              className="text-primary underline hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {hasChildren(node) && (
                <LexicalRenderer nodes={node.children} rootNodes={effectiveRootNodes} />
              )}
            </a>
          )
        }

        // block node (embedded Payload blocks)
        if (node.type === 'block') {
          const blockType = node.fields?.blockType as string | undefined
          if (blockType) {
            const block: CMSBlock = {
              ...node.fields,
              blockType, // blockType comes last to ensure it's not overwritten
            }
            return <BlocksRenderer key={index} blocks={[block]} />
          }
        }

        // line break
        if (node.type === 'linebreak') {
          return <br key={index} />
        }

        // upload image
        if (node.type === 'upload' && node.value) {
          // Check if value is an object with url property
          if (typeof node.value === 'object' && 'url' in node.value) {
            const src = (node.value as any).url as string
            const alt = ((node.value as any).alt as string) || ''
            return (
              <img
                key={index}
                src={src}
                alt={alt}
                title={alt}
                className="my-4 max-w-full max-h-48"
                loading="lazy"
              />
            )
          }
        }

        // checklist listitem
        if (node.type === 'listitem' && typeof node.checked === 'boolean') {
          return (
            <li key={index} className={`flex items-center gap-2 ${getBlockClass(node)}`}>
              <span className="mt-1" aria-hidden>
                {node.checked ? (
                  // visually similar to the Vue icon intent
                  <span className="text-primary-500 text-xl">●</span>
                ) : (
                  <span className="text-gray-400 text-xl">○</span>
                )}
              </span>
              <span className="align-middle">
                {hasChildren(node) && (
                  <LexicalRenderer nodes={node.children} rootNodes={effectiveRootNodes} />
                )}
              </span>
            </li>
          )
        }

        // horizontal rule
        if (node.type === 'horizontalrule') {
          return <hr key={index} className={getBlockClass(node)} />
        }

        // generic block rendering
        const Tag = resolveTag(node) as any
        const id = headingIdFor(node, rootNodes)
        const className = getBlockClass(node)
        return (
          <Tag key={index} id={id} className={className}>
            {hasChildren(node) && (
              <LexicalRenderer nodes={node.children} rootNodes={effectiveRootNodes} />
            )}
          </Tag>
        )
      })}
    </>
  )
}
