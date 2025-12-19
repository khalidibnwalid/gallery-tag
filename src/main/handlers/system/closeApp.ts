import { app } from 'electron'

export default function closeAppHandler() {
  app.quit()
}
