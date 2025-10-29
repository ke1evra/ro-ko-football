import type { GlobalConfig } from 'payload'

function isAdmin(req: any): boolean {
  const user: any = req.user
  return Boolean(user?.role === 'admin')
}

export const OutcomeManager: GlobalConfig = {
  slug: 'outcome-manager',
  label: 'Управление исходами',
  admin: {
    description: 'Управление группами исходов и исходами для букмекерских ставок',
  },
  access: {
    read: ({ req }) => isAdmin(req),
    update: ({ req }) => isAdmin(req),
  },
  fields: [
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Описание управления исходами.',
      },
    },
  ],
}

export default OutcomeManager
