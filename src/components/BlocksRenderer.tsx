import React from 'react'
import RichTextRenderer from './RichTextRenderer'
import CardBlock from './blocks/CardBlock'
import SeparatorBlock from './blocks/SeparatorBlock'
import MatchBlock from './blocks/MatchBlock'
import { PlayerBlock } from './blocks/PlayerBlock'
import FixturesBlock from './blocks/FixturesBlock'
import StandingsBlock from './blocks/StandingsBlock'
import TimelineBlock from './blocks/TimelineBlock'

export type CMSBlock = {
  id?: string
  blockType: string
  [key: string]: any
}

export default function BlocksRenderer({ blocks }: { blocks?: CMSBlock[] | null }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <div>
      {blocks.map((block, i) => {
        const key = block.id || `${block.blockType}-${i}`

        switch (block.blockType) {
          case 'richText':
            return <RichTextRenderer key={key} value={block.content} />

          case 'separator':
            return <SeparatorBlock key={key} />

          case 'card':
            return (
              <CardBlock
                key={key}
                title={block.title}
                description={block.description}
                content={block.content}
              />
            )

          case 'match': {
            return <MatchBlock key={key} match={block.match} />
          }

          case 'player': {
            return <PlayerBlock key={key} player={block.player} />
          }

          case 'fixtures': {
            const fixtures = Array.isArray(block.fixtures) ? block.fixtures : []
            return <FixturesBlock key={key} fixtures={fixtures} />
          }

          case 'standings': {
            const teams = Array.isArray(block.teams) ? block.teams : []
            return <StandingsBlock key={key} teams={teams} />
          }

          case 'timeline': {
            const events = Array.isArray(block.events) ? block.events : []
            return <TimelineBlock key={key} events={events} />
          }

          default:
            return (
              <pre key={key} style={{ background: '#f8f8f8', padding: 8 }}>
                {JSON.stringify(block, null, 2)}
              </pre>
            )
        }
      })}
    </div>
  )
}
