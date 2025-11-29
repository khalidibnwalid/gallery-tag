import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

interface ImageItem {
  title: string
  imagePath: string
}

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)

  const handleOpenFolder = async () => {
    setLoading(true)
    try {
      // Check if the API is available
      if (!window.api || !window.api.openFolderDialog) {
        console.error('API not available')
        alert('API not available. Make sure the app is running in Electron.')
        return
      }

      console.log('Opening folder dialog...')
      const folderPath = await window.api.openFolderDialog()
      console.log('Selected folder:', folderPath)

      if (folderPath) {
        setCurrentFolder(folderPath)
        console.log('Getting image files from:', folderPath)
        const imageFiles = await window.api.getImageFiles(folderPath)
        console.log('Found image files:', imageFiles)

        const imageItems: ImageItem[] = imageFiles.map(filePath => {
          const fileName =
            filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown'
          const title = fileName.replace(/\.[^/.]+$/, '') // Remove file extension
          console.log('Adding image:', title, filePath)
          return {
            title,
            imagePath: filePath,
          }
        })

        setImages(imageItems)
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      alert(`Error opening folder: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Image Gallery</h1>
          {currentFolder && (
            <p className="text-gray-600 text-sm">
              Folder: {currentFolder} ({images.length} images)
            </p>
          )}
        </div>
        <Button onClick={handleOpenFolder} disabled={loading}>
          {loading ? 'Loading...' : 'Open Folder'}
        </Button>
      </div>

      {images.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No images loaded. Click "Open Folder" to select a folder containing
            images.
          </p>
        </div>
      )}

      {images.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 space-y-4 pb-20">
          {images.map((image, index) => (
            <Card key={index} title={image.title} imagePath={image.imagePath} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ title, imagePath }: ImageItem) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="border rounded-lg overflow-hidden shadow-md relative group animate-fade-in">
      {!imageError ? (
        <img
          src={`file://${imagePath}`}
          alt={title}
          className="w-full object-cover inset-0"
          onError={() => {
            console.error('Error loading image:', imagePath)
            setImageError(true)
          }}
        />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-muted">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Failed to load image</p>
            <p className="text-foreground text-xs mt-1">{title}</p>
          </div>
        </div>
      )}
      <div className="p-4 bg-linear-to-t from-background to-transparent absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </div>
  )
}
