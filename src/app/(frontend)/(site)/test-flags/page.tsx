import { CountryFlagImage } from '@/components/CountryFlagImage'

export default function TestFlagsPage() {
  const testCountries = [
    { id: 1, name: 'Germany' },
    { id: 21, name: 'France' },
    { id: 47, name: 'Italy' },
    { id: 19, name: 'England' },
    { id: 43, name: 'Spain' },
    { id: 84, name: 'Champions League' }, // Эта "страна" не должна иметь флаг
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Тест флагов стран</h1>
      
      <div className="grid grid-cols-3 gap-4">
        {testCountries.map((country) => (
          <div key={country.id} className="border p-4 rounded">
            <h3 className="font-semibold mb-2">{country.name} (ID: {country.id})</h3>
            
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Small:</p>
                <div className="w-8 h-8 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="small"
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Medium:</p>
                <div className="w-12 h-12 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="medium"
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Large:</p>
                <div className="w-16 h-16 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="large"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                API URL: <a 
                  href={`/api/countries/${country.id}/flag?size=medium`}
                  target="_blank"
                  className="text-blue-500 hover:underline"
                >
                  /api/countries/{country.id}/flag?size=medium
                </a>
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Прямые ссылки на API:</h2>
        <ul className="space-y-2">
          {testCountries.map((country) => (
            <li key={country.id}>
              <a 
                href={`/api/countries/${country.id}/flag?size=medium`}
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                {country.name} - /api/countries/{country.id}/flag?size=medium
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}