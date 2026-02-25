import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const viewerPassword = (process.env.VIEWER_PASSWORD ?? '').trim();
    if (!viewerPassword) {
      return NextResponse.json({ error: 'Viewer access not configured. Set VIEWER_PASSWORD env var.' }, { status: 500 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      try {
        const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const viewerEmail = 'viewer@teachervault.local';
        const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
        if (!listError) {
          const viewerExists = usersData?.users?.find(u => u.email === viewerEmail);
          if (!viewerExists) {
            await adminClient.auth.admin.createUser({ email: viewerEmail, password: viewerPassword, email_confirm: true });
          }
        }
      } catch (e) { console.error('Supabase admin error:', e); }
    }

    return NextResponse.json({ email: 'viewer@teachervault.local', password: viewerPassword });
  } catch (err) {
    console.error('Viewer auth error:', err);
    return NextResponse.json({ error: 'Server error during authentication' }, { status: 500 });
  }
}
