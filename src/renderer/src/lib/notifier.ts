import { createProgressToast } from '@/components/ui/toast'
import {
  NotifyImageThumbnailGeneratedPartPayload,
  NotifyImageThumbnailGenerationCompletePayload,
} from '@main/types/notifier.shared'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ProgressState {
  toastId: string | number
  currentProgress: number
  totalProgress: number
}

let globalNotifyUnsubscribe: (() => void) | null = null
let subscriptionCount = 0
let progressStateMap = new Map<string, ProgressState>()

export function setupGlobalNotifier(queryClient?: QueryClient) {
  if (!window.api || !window.api.general.onNotify) return

  // subscribe if none exists
  if (subscriptionCount === 0) {
    subscriptionCount++
    globalNotifyUnsubscribe = window.api.general.onNotify(notification => {
      switch (notification.id) {
        case 'image-thumbnail-generated':
          if (notification.type === 'progress.part') {
            const payload =
              notification.payload as NotifyImageThumbnailGeneratedPartPayload
            const sessionId = payload.sessionId || '-'
            let progressState = progressStateMap.get(sessionId)
            if (!progressState) {
              const toastId = toast.custom(
                () =>
                  createProgressToast(
                    1,
                    payload.total,
                    'Generating Thumbnails',
                    `${progressState?.currentProgress} of ${progressState?.totalProgress} thumbnails generated`,
                  ),
                { duration: Infinity },
              )
              progressState = {
                toastId,
                currentProgress: 1,
                totalProgress: payload.total,
              }
              progressStateMap.set(sessionId, progressState)
            } else {
              progressState.currentProgress = payload.order
              progressState.totalProgress = payload.total

              toast.custom(
                () =>
                  createProgressToast(
                    progressState?.currentProgress,
                    progressState?.totalProgress,
                    'Generating Thumbnails',
                    `${progressState?.currentProgress} of ${progressState?.totalProgress} thumbnails generated`,
                  ),
                { id: progressState.toastId, duration: Infinity },
              )
            }
            console.log('Thumbnail generated')
          } else if (notification.type === 'progress.complete') {
            console.log('Thumbnail generation complete notification received')
            const payload =
              notification.payload as NotifyImageThumbnailGenerationCompletePayload
            const sessionId = payload.sessionId || 'default'
            const progressState = progressStateMap.get(sessionId)

            if (progressState) {
              toast.dismiss(progressState.toastId)
              progressStateMap.delete(sessionId)
            }

            toast.success(`Thumbnail generation complete!`, {
              description: `Processed ${payload.totalProcessed} images${payload.totalFailed > 0 ? `, ${payload.totalFailed} failed` : ''}`,
            })

            if (queryClient) {
              queryClient.invalidateQueries()
            }
          }
          break
        default:
          break
      }
    })
  }

  return () => {
    if (subscriptionCount > 0) {
      subscriptionCount--
      globalNotifyUnsubscribe?.()
      globalNotifyUnsubscribe = null
    }
  }
}
