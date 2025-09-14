'use client'

import React from 'react'

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 py-1">{children}</div>
}

export default function ApiTestPanel() {
  const [teamId, setTeamId] = React.useState('1440')
  const [countryId, setCountryId] = React.useState('71')
  const [countryCode, setCountryCode] = React.useState('AUS')

  const teamFlagUrl = teamId ? `/api/flags/${teamId}` : ''
  const countryFlagByIdUrl = countryId ? `/api/flags/country-id/${countryId}` : ''
  const countriesUrl = '/api/ls/countries'

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h3 className="font-semibold text-lg">API тест-панель</h3>
      <p className="text-sm text-muted-foreground">
        Последовательность владения: Страны → Соревнования/Команды → Ресурсы (флаги).
      </p>

      {/* 1. Страны */}
      <div className="space-y-2">
        <h4 className="font-medium">1) Список стран (JSON)</h4>
        <Row>
          <a
            href={countriesUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-primary"
          >
            Открыть /api/ls/countries
          </a>
        </Row>
      </div>

      {/* 2. Флаг страны по country_id */}
      <div className="space-y-2">
        <h4 className="font-medium">2) Флаг страны по country_id → PNG</h4>
        <Row>
          <label className="text-sm w-36">country_id:</label>
          <input
            className="border rounded px-2 py-1 text-sm w-40"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            placeholder="например, 71"
          />
          {countryId ? (
            <a
              href={countryFlagByIdUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              Открыть {countryFlagByIdUrl}
            </a>
          ) : null}
        </Row>
        <Row>
          {countryId ? (
            <img
              src={countryFlagByIdUrl}
              alt={`flag country ${countryId}`}
              className="h-8 w-auto rounded border"
            />
          ) : null}
        </Row>
      </div>

      {/* 3. Флаг национальной команды по team_id */}
      <div className="space-y-2">
        <h4 className="font-medium">3) Флаг национальной команды по team_id → PNG</h4>
        <Row>
          <label className="text-sm w-36">team_id (только сборные):</label>
          <input
            className="border rounded px-2 py-1 text-sm w-40"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="например, 1440 (Australia)"
          />
          {teamId ? (
            <a
              href={teamFlagUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              Открыть {teamFlagUrl}
            </a>
          ) : null}
        </Row>
        <Row>
          {teamId ? (
            <img
              src={teamFlagUrl}
              alt={`flag team ${teamId}`}
              className="h-8 w-auto rounded border"
            />
          ) : null}
        </Row>
      </div>

      {/* 4. Флаг страны по коду (UI-тест; предупреждение) */}
      <div className="space-y-2">
        <h4 className="font-medium">
          4) Флаг страны по коду (AUS, GER) — не поддерживается API напрямую
        </h4>
        <p className="text-xs text-muted-foreground">
          Прямой вызов по коду не поддерживается Livescore API — требуется country_id или team_id.
          Этот блок оставлен как UI-тест для проверки редиректа/ошибок.
        </p>
        <Row>
          <label className="text-sm w-36">country code:</label>
          <input
            className="border rounded px-2 py-1 text-sm w-40"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="например, AUS"
          />
          {countryCode ? (
            <a
              href={`/api/flags/country/${countryCode}`}
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              Открыть /api/flags/country/{countryCode}
            </a>
          ) : null}
        </Row>
      </div>
    </div>
  )
}
