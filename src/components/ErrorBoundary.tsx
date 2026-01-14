import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep this console output: it is the quickest way to debug a white screen.
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-lg w-full rounded border border-gray-200 p-4">
          <div className="font-semibold mb-2">Något gick fel</div>
          <div className="text-sm text-gray-600 mb-3">
            Om du ser en vit sida på t.ex. /portal: öppna DevTools → Console och kopiera första felet.
          </div>
          <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto">
            {this.state.error.message}
          </pre>
          <a className="inline-block mt-3 text-sm text-blue-600 underline" href="/">
            Tillbaka till startsidan
          </a>
        </div>
      </div>
    );
  }
}
