'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { Button } from '@/components/ui/button'

import { Hand, MousePointer2, Redo2, Undo2 } from 'lucide-react'
import { useEffect } from 'react'

export type InteractionMode = 'select' | 'pan'

interface InteractionToolbarProps {
  mode: InteractionMode
  onModeChange: (mode: InteractionMode) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
}

export function InteractionToolbar({
  mode,
  onModeChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: InteractionToolbarProps) {
  // Detect if user is on Mac
  const isMac =
    typeof window !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input is focused
      const activeElement = document.activeElement
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true' ||
        activeElement?.closest('[contenteditable="true"]') ||
        activeElement?.closest('[role="textbox"]') ||
        activeElement?.closest('.monaco-editor')
      ) {
        return
      }

      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Undo: Cmd/Ctrl + Z
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
      }
      // Redo: Cmd/Ctrl + Shift + Z
      else if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        onRedo?.()
      }
      // Select mode: V
      else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        onModeChange('select')
      }
      // Pan mode: P
      else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        onModeChange('pan')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onModeChange, onUndo, onRedo, isMac])

  const cmdKey = isMac ? '⌘' : 'Ctrl'

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-background rounded-full shadow-lg p-2">
        <TooltipProvider delayDuration={600}>
          {/* Pan Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onModeChange('pan')}
                aria-label="Pan mode"
                variant={mode === 'pan' ? 'secondary' : 'ghost'}
                size="icon"
                className="!size-10 rounded-full"
              >
                <Hand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">Pan · P</p>
            </TooltipContent>
          </Tooltip>

          {/* Select Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onModeChange('select')}
                variant={mode === 'select' ? 'secondary' : 'ghost'}
                size="icon"
                className="!size-10 rounded-full"
              >
                <MousePointer2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">Select · V</p>
            </TooltipContent>
          </Tooltip>

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onUndo}
                disabled={!canUndo}
                variant="ghost"
                size="icon"
                className="!size-10 rounded-full"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">Undo · {cmdKey} Z</p>
            </TooltipContent>
          </Tooltip>

          {/* Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRedo}
                disabled={!canRedo}
                variant="ghost"
                size="icon"
                className="!size-10 rounded-full"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">Redo · {cmdKey} ⇧ Z</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
