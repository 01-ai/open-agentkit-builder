'use client'

import type { Edge, Node } from '@xyflow/react'
import { useCallback, useRef, useState } from 'react'

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
}

interface UseHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  takeSnapshot: (nodes: Node[], edges: Edge[]) => void
  clear: () => void
}

export function useHistory(
  onRestore: (nodes: Node[], edges: Edge[]) => void
): UseHistoryReturn {
  const [past, setPast] = useState<HistoryState[]>([])
  const [future, setFuture] = useState<HistoryState[]>([])

  // Track if we're in the middle of undo/redo to avoid adding to history
  const isRestoring = useRef(false)

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    // Don't add to history if we're restoring
    if (isRestoring.current) {
      return
    }

    // Create a deep copy to avoid reference issues
    const snapshot: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }

    setPast((prev) => {
      // Limit history to 50 items to prevent memory issues
      const newPast = [...prev, snapshot]
      if (newPast.length > 50) {
        return newPast.slice(1)
      }
      return newPast
    })

    // Clear future when new action is taken
    setFuture([])
  }, [])

  const undo = useCallback(() => {
    if (past.length === 0) return

    isRestoring.current = true

    setPast((prev) => {
      const newPast = [...prev]
      const current = newPast.pop()

      if (current) {
        setFuture((f) => [current, ...f])

        // Restore the previous state
        if (newPast.length > 0) {
          const previousState = newPast[newPast.length - 1]
          // Defer restore to avoid setState during render warnings
          setTimeout(() => {
            onRestore(previousState.nodes, previousState.edges)
          }, 0)
        }
      }

      return newPast
    })

    // Reset flag after a tick
    setTimeout(() => {
      isRestoring.current = false
    }, 0)
  }, [past.length, onRestore])

  const redo = useCallback(() => {
    if (future.length === 0) return

    isRestoring.current = true

    setFuture((prev) => {
      const newFuture = [...prev]
      const next = newFuture.shift()

      if (next) {
        setPast((p) => [...p, next])
        // Defer restore to avoid setState during render warnings
        setTimeout(() => {
          onRestore(next.nodes, next.edges)
        }, 0)
      }

      return newFuture
    })

    // Reset flag after a tick
    setTimeout(() => {
      isRestoring.current = false
    }, 0)
  }, [future.length, onRestore])

  const clear = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    takeSnapshot,
    clear,
  }
}
