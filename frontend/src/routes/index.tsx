import { createFileRoute } from "@tanstack/react-router";

const MOCK_IMAGES = [
  {
    title: "Sunset Over Mountains",
    imageUrl: "https://mockimage.tw/flickr/450x300",
  },
  {
    title: "City Skyline",
    imageUrl: "https://mockimage.tw/flickr/768x512",
  },
  {
    title: "Forest Path",
    imageUrl: "https://mockimage.tw/flickr/400x600",
  },
  {
    title: "Beach View",
    imageUrl: "https://mockimage.tw/flickr/800x500",
  },
  {
    title: "Snowy Peaks",
    imageUrl: "https://mockimage.tw/flickr/300x700",
  },
  {
    title: "Lake Reflection",
    imageUrl: "https://mockimage.tw/flickr/400x600",
  },
  {
    title: "Desert Dunes",
    imageUrl: "https://mockimage.tw/flickr/700x430",
  },
  {
    title: "Mountain Lake",
    imageUrl: "https://mockimage.tw/flickr/800x600",
  },
  {
    title: "Countryside Road",
    imageUrl: "https://mockimage.tw/flickr/700x467",
  },
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-6">
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-4 pb-10">
        {MOCK_IMAGES.map((image, index) => (
          <Card key={index} title={image.title} imageUrl={image.imageUrl} />
        ))}
      </div>
    </div>
  );
}

function Card({ title, imageUrl }: { title: string; imageUrl: string }) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-md relative group animate-fade-in">
      <img src={imageUrl} alt={title} className="w-full object-cover inset-0" />
      <div className="p-4 bg-linear-to-t from-background to-transparent absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </div>
  );
}
