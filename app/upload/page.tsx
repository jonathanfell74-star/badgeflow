import { Suspense } from 'react';
import UploadClient from './UploadClient';

// make this page dynamic so it doesn't try to prerender with static data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
          Loading upload…
        </div>
      }
    >
      <UploadClient />
    </Suspense>
  );
}
