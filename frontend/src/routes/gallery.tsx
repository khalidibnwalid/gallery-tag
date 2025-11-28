import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/gallery")({
  component: Gallery,
});

function Gallery() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Gallery</h1>
      <p className="text-muted-foreground">Your photo gallery goes here.</p>
    </div>
  );
}
