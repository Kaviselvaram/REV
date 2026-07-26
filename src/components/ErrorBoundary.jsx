import { Component } from 'react'
import { ErrorState } from './States'

/* Catches render crashes so a single broken screen never blanks the whole
   app. React only supports this as a class component. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Wire to the error monitor when the backend lands. Never log PII.
    if (import.meta.env.DEV) console.error('[REV] render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grain min-h-screen bg-asphalt">
          <ErrorState
            title="REV hit a snag."
            body="This screen failed to render. Reloading usually clears it — nothing you saved has been lost."
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
