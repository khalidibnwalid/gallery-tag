async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator?.clipboard) {
    console.warn('Clipboard not supported')
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.warn('Copy failed', error)
    return false
  }
}

async function readFromClipboard(): Promise<string | null> {
  if (!navigator?.clipboard) {
    console.warn('Clipboard not supported')
    return null
  }

  try {
    return await navigator.clipboard.readText()
  } catch (error) {
    console.warn('Read from clipboard failed', error)
    return null
  }
}

export { copyToClipboard, readFromClipboard }
