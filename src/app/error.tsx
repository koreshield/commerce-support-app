"use client";

export default function ErrorPage({ reset }: { reset: () => void }): React.ReactElement {
  return (
    <main>
      <h1>The demo workspace could not load</h1>
      <p>Retry the request. If it still fails, reset the synthetic database from the command line.</p>
      <button onClick={reset} type="button">
        Retry loading the workspace
      </button>
    </main>
  );
}
