"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <p className="eyebrow">Evolyn</p>
      <h1>Something went wrong</h1>
      <p className="muted">{error.message || "The console could not load this view."}</p>
      <button className="run-button" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
