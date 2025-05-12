import Link from 'next/link'

export const AuthBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="p-6 border rounded-md">{children}</div>
      <Link className="text-xs text-muted-foreground" href="/">
        &larr; Back to home
      </Link>
    </div>
  )
}
