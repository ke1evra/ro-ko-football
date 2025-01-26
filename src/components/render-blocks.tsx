import React from 'react'
import type { Home } from '@/payload-types'
import { HeroBlock } from '@/blocks/HeroBlock'

const blockComponents = {
  hero: HeroBlock,
} as const

export function RenderBlocks({ blocks }: { blocks: Home['blocks'] }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null
  }

  return (
    <>
      {blocks.map((block, index) => {
        const { blockType } = block
        const Block = blockType && blockType in blockComponents ? blockComponents[blockType] : null

        return Block ? (
          <div className="my-16" key={index}>
            <Block {...block} />
          </div>
        ) : null
      })}
    </>
  )
}
