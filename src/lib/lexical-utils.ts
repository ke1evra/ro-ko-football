/**
 * Утилиты для работы с Lexical контентом
 */

/**
 * Извлекает простой текст из Lexical JSON для превью
 */
export function extractTextFromLexical(lexicalContent: any): string {
  if (!lexicalContent) return ''

  // Если это строка (старый формат), возвращаем как есть
  if (typeof lexicalContent === 'string') {
    return lexicalContent
  }

  // Если это объект Lexical
  if (typeof lexicalContent === 'object' && lexicalContent.root) {
    return extractTextFromNodes(lexicalContent.root.children || [])
  }

  return ''
}

function extractTextFromNodes(nodes: any[]): string {
  if (!Array.isArray(nodes)) return ''

  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.text || ''
      }

      if (node.children && Array.isArray(node.children)) {
        return extractTextFromNodes(node.children)
      }

      return ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Обрезает текст до указанной длины с многоточием
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text

  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}
