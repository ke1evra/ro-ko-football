import Link from 'next/link'

export const AuthBox = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full sm:w-sm mx-auto space-y-4">
      <div className="p-6 border rounded-md bg-background">{children}</div>
      <Link className="text-xs text-muted-foreground" href="/">
        &larr; Back to home
      </Link>
    </div>
  )
}
