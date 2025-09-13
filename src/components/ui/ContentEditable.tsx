'use client'

import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import * as React from 'react'

const ContentEditableUI = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ContentEditable>
>(({ className, ...props }, ref) => {
  return <ContentEditable ref={ref} className={className} {...props} />
})

ContentEditableUI.displayName = 'ContentEditable'

export { ContentEditableUI as ContentEditable }
