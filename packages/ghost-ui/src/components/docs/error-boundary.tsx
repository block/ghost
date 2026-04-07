import React from "react";

export class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    name: string;
    fallback: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in component ${this.props.name}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 text-red-500">
          Something went wrong in component: {this.props.name}
        </div>
      );
    }

    return this.props.children;
  }
}
