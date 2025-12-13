import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '../providers/ThemeProvider'
import { Progress } from './progress'
import { Spinner } from './spinner'

function createProgressToast(
  currentProgress: number = 0,
  totalProgress: number = 0,
  title: string,
  subText?: string,
) {
  const progressPercentage = Math.round((currentProgress / totalProgress) * 100)

  return (
    <div className="space-y-2 min-w-[400px] rounded-xl border px-5 py-3 bg-background">
      <div className="flex justify-between text-sm">
        <span>{title}</span>
        <span className="font-medium">{progressPercentage}%</span>
      </div>
      <Progress value={progressPercentage} />
      <div className="text-xs text-muted-foreground">{subText}</div>
    </div>
  )
}

function Toaster(props: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <Spinner className="size-4" />,
      }}
      style={
        {
          '--normal-bg': 'var(--background)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { createProgressToast, Toaster }
