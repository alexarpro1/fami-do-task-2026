"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
  }

  handleReset = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("famiapp-state")
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Datenfehler</h1>
            <p className="text-muted-foreground">
              Ein Fehler ist aufgetreten. Dies kann durch beschädigte Daten verursacht worden sein.
            </p>
            <Button onClick={this.handleReset} variant="destructive" className="w-full">
              App zurücksetzen
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
