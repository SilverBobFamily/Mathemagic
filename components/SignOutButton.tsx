'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  };

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: 'none',
        border: '1px solid #444',
        borderRadius: 6,
        color: '#aaa',
        cursor: 'pointer',
        fontSize: '0.95em',
        fontFamily: "'Crimson Text', serif",
        padding: '4px 12px',
      }}
    >
      Sign out
    </button>
  );
}
