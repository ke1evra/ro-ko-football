/**
 * ESLint Plugin: no-mojibake
 * 
 * Detects Unicode replacement characters (U+FFFD -) in code.
 * These characters often appear as artifacts from AI coding tools
 * or encoding issues.
 * 
 * @see https://unicode.org/glossary/#replacement_character
 */

// Unicode Replacement Character (U+FFFD)
const REPLACEMENT_CHAR = '\uFFFD'
const REPLACEMENT_CHAR_NAME = 'U+FFFD'

/**
 * Rule implementation for detecting Unicode replacement characters
 */
const rule = {
  meta: {
    name: 'no-mojibake/no-replacement-characters',
    version: '1.0.0',
    description: 'Detect Unicode replacement characters (U+FFFD) in code',
    recommended: true,
    fixable: false,
    schema: [],
    messages: {
      replacementCharacter: 'Found Unicode replacement character ({{ charName }}) at line {{ line }}, column {{ column }} - possible encoding issue or AI artifact',
    },
  },
  create(context) {
    // Get the source code as raw text
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const fileContent = sourceCode.getText()

    // Search for replacement characters in the content
    const lines = fileContent.split('\n')

    // Track reported positions to avoid duplicates
    const reportedPositions = new Set()

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      
      for (let colIndex = 0; colIndex < line.length; colIndex++) {
        const char = line[colIndex]
        
        // Check for U+FFFD
        if (char === REPLACEMENT_CHAR || (char.codePointAt && char.codePointAt(0) === 0xFFFD)) {
          const posKey = `${lineIndex + 1}:${colIndex + 1}`
          if (reportedPositions.has(posKey)) continue
          reportedPositions.add(posKey)

          const actualLine = lineIndex + 1 // ESLint uses 1-based line numbers
          const actualColumn = colIndex + 1 // ESLint uses 1-based column numbers

          // Calculate the actual range in the source
          const rangeStart = lines.slice(0, lineIndex).reduce((acc, l) => acc + l.length + 1, 0) + colIndex
          const rangeEnd = rangeStart + (char.length || 1)

          // Create a node-like object for the location
          const node = {
            type: 'Literal',
            value: char,
            loc: {
              start: { line: actualLine, column: colIndex },
              end: { line: actualLine, column: colIndex + 1 },
            },
            range: [rangeStart, rangeEnd],
          }

          context.report({
            node,
            messageId: 'replacementCharacter',
            data: {
              charName: REPLACEMENT_CHAR_NAME,
              line: actualLine,
              column: actualColumn,
            },
          })
        }
      }
    }

    return {}
  },
}

/**
 * Plugin definition with correct initialization order
 */
const plugin = {
  meta: {
    name: 'no-mojibake',
    version: '1.0.0',
  },
  rules: {
    'no-replacement-characters': rule,
  },
}

export { plugin, rule, REPLACEMENT_CHAR, REPLACEMENT_CHAR_NAME }

export default plugin
