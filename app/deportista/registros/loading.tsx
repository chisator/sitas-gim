export default function Loading() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto space-y-6">
        <div className="h-10 w-2/3 max-w-sm animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
