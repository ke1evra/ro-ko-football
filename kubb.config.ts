import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginClient } from '@kubb/plugin-client'

export default defineConfig({
  root: '.',
  input: {
    // В этом проекте спецификация лежит в src/app/openapi
    path: './src/app/openapi/life-score.com.yaml',
  },
  output: {
    // Кладём клиент и типы в фронтенд-область приложения
    path: './src/app/(frontend)/client',
    clean: true,
  },
  plugins: [
    pluginOas({
      validate: false,
    }),
    pluginTs({
      output: {
        path: './types',
        banner: '/* eslint-disable @typescript-eslint/no-explicit-any */',
      },
      dateType: 'date',
      unknownType: 'unknown',
      optionalType: 'questionTokenAndUndefined',
      oasType: false,
    }),
    pluginClient({
      output: {
        path: './clients',
        barrelType: 'named',
      },
      group: {
        type: 'tag',
        name: ({ group }) => `${group.replace(/ /g, '')}Service`,
      },
      operations: true,
      importPath: '@/lib/http/livescore/customFetch',
      dataReturnType: 'full',
      urlType: 'export',
      pathParamsType: 'inline',
      parser: 'client',
    }),
  ],
})
