import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const viewerPassword = (process.env.VIEWER_PASSWORD ?? '').trim();

    if (!viewerPassword) {
      return NextResponse.json(
        { error: 'Viewer access not configured. Set VIEWER_PASSWORD env var.' },
        { status: 500 }
      );
    }

    // ---------- Ensure viewer account exists ----------
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      try {
        const adminClient = createClient(
          supabaseUrl,
          serviceKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const viewerEmail = 'viewer@teachervault.local';

        const { data: usersData, error: listError } =
          await adminClient.auth.admin.listUsers();

        if (listError) {
          console.error('List users error:', listError);
        } else {
          const viewerExists = usersData?.users?.find(
            u => u.email === viewerEmail
          );

          if (!viewerExists) {
            const { error: createError } =
              await adminClient.auth.admin.createUser({
                email: viewerEmail,
                password: viewerPassword,
                email_confirm: true,
              });

            if (createError) {
              console.error('Create viewer error:', createError);
            }
          }
        }
      } catch (supabaseErr) {
        console.error('Supabase admin error:', supabaseErr);
      }
    }

    // ---------- Success — return credentials ----------
    return NextResponse.json({
      email: 'viewer@teachervault.local',
      password: viewerPassword,
    });
  } catch (err) {
    console.error('Viewer auth fatal error:', err);
    return NextResponse.json(
      { error: 'Server error during authentication' },
      { status: 500 }
    );
  }
}
