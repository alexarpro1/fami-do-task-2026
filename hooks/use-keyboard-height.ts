"use client"

import { useEffect, useState } from "react"

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleResize = () => {
      // Calculate keyboard height on mobile
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      const keyboardHeight = Math.max(0, windowHeight - viewportHeight)
      setKeyboardHeight(keyboardHeight)
    }

    window.visualViewport?.addEventListener("resize", handleResize)
    window.addEventListener("resize", handleResize)

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return keyboardHeight
}
