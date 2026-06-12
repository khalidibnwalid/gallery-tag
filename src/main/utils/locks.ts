const activeSyncs = new Map<string, Promise<void>>()

export async function runExclusiveSync(
  folderPath: string,
  fn: () => Promise<void>,
): Promise<void> {
  // Wait for any existing sync on this folder to complete
  while (activeSyncs.has(folderPath)) {
    const existingPromise = activeSyncs.get(folderPath)
    if (existingPromise) {
      try {
        await existingPromise //yielding cpu by awaiting the promise of previous sync
      } catch (err) {}
    }
  }

  // claiming the lock
  let resolvePromise!: () => void
  const promise = new Promise<void>(resolve => {
    resolvePromise = resolve
  })

  activeSyncs.set(folderPath, promise)

  try {
    await fn()
  } finally {
    activeSyncs.delete(folderPath)
    resolvePromise() //releasing the lock
  }
}
