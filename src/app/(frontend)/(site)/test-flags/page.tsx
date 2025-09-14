import { CountryFlagImage } from '@/components/CountryFlagImage'

export default function TestFlagsPage() {
  const testCountries = [
    // Реальные страны
    { id: 1, name: 'Germany' },
    { id: 21, name: 'France' },
    { id: 47, name: 'Italy' },
    { id: 19, name: 'England' },
    { id: 43, name: 'Spain' },
    { id: 12, name: 'Russia' },
    
    // Турниры (должны показывать заглушки)
    { id: 84, name: 'Champions League' },
    { id: 217, name: 'African Nations Championship' },
    { id: 94, name: 'Africa Cup of Nations' },
    { id: 101, name: 'Asian Cup' },
    { id: 138, name: 'CONCACAF Nations League' },
    
    // Несуществующие ID (должны показывать заглушки)
    { id: 999, name: 'Test Country' },
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Тест флагов стран и турниров</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {testCountries.map((country) => (
          <div key={country.id} className="border p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-sm">{country.name}</h3>
            <p className="text-xs text-gray-500 mb-3">ID: {country.id}</p>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Small:</p>
                <div className="w-6 h-6 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="small"
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-600 mb-1">Medium:</p>
                <div className="w-8 h-8 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="medium"
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-600 mb-1">Large:</p>
                <div className="w-12 h-12 border">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    size="large"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Ожидаемое поведение:</h2>
        <ul className="text-sm space-y-1">
          <li>• <strong>Реальные страны</strong> (Germany, France, etc.) - должны показывать флаги</li>
          <li>• <strong>Турниры</strong> (Champions League, etc.) - должны показывать первую букву названия</li>
          <li>• <strong>Несуществующие ID</strong> - должны показывать заглушку после попытки загрузки</li>
          <li>• <strong>Ошибки загрузки</strong> - логируются только для реальных стран</li>
        </ul>
      </div>
    </div>
  )
}