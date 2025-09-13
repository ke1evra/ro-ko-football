'use client'

// import { ContentEditable } from '@lexical/react/LexicalContentEditable'
// Временная заглушка, пока не установим @lexical/react
const ContentEditable = ({ className, ...props }: any) => (
  <div className={className} contentEditable {...props} />
)
import * as React from 'react'

const ContentEditableUI = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ContentEditable>
>(({ className, ...props }, ref) => {
  return <ContentEditable ref={ref} className={className} {...props} />
})

ContentEditableUI.displayName = 'ContentEditable'

export { ContentEditableUI as ContentEditable }
