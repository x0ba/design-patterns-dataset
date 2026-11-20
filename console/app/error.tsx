'use client';

import { Button } from '@ui-sdk/react/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h1>This Page Couldn’t Load</h1>
      <p>The console hit an error reading the dataset files:</p>
      <pre><code>{error.message}</code></pre>
      <p>Fix the file it names, or check the terminal running the console for details.</p>
      <Button className="button" onClick={reset}>Try Again</Button>
    </div>
  );
}
