import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/favorites')({
  component: Favorites,
})

function Favorites() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Favorites</h1>
      <p className="text-muted-foreground">
        Your favorite photos will appear here.
      </p>
    </div>
  )
}
