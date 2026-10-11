import Link from 'next/link';

export default function Brand({ href = '/' }) {
  return (
    <Link href={href} className="brand" aria-label="Darka — на главную">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width="40" height="35" />
      <span>Darka</span>
    </Link>
  );
}
