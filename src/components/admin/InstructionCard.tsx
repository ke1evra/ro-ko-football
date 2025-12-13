'use client'

import React from 'react'
import styles from './InstructionCard.module.css'

interface InstructionSection {
  title: string
  items: string[]
  icon?: string
}

interface InstructionCardProps {
  emoji: string
  title: string
  sections: InstructionSection[]
  warning?: string
}

export const InstructionCard: React.FC<InstructionCardProps> = ({
  emoji,
  title,
  sections,
  warning,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.emoji}>{emoji}</span>
        <h2 className={styles.title}>{title}</h2>
      </div>

      <div className={styles.content}>
        {sections.map((section, index) => (
          <div key={index} className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {section.icon && <span className={styles.sectionIcon}>{section.icon}</span>}
              {section.title}
            </h3>
            <ul className={styles.list}>
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {warning && (
        <div className={styles.warning}>
          <span className={styles.warningIcon}>⚠️</span>
          <span className={styles.warningText}>{warning}</span>
        </div>
      )}
    </div>
  )
}

export default InstructionCard
