import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Not Found</h1>
      <p>Nothing lives at this address. The batch, site or codebook entry may have been renamed or removed.</p>
      <p><Link href="/">Go to Progress</Link></p>
    </div>
  );
}
