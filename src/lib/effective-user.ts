import { createServerSupabase } from './supabase-server';
import { createClient } from '@supabase/supabase-js';

const VIEWER_EMAIL = 'viewer@teachervault.local';

/**
 * Returns the user_id to use for data queries and the right supabase client.
 * - Teacher: returns their own user_id + normal RLS client
 * - Viewer: returns TEACHER_USER_ID + service role client (bypasses RLS)
 */
export async function getEffectiveUser() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { user: null, userId: null, role: null as string | null, isViewer: false, isTeacher: false, supabase };

  const isViewer = user.email === VIEWER_EMAIL;
  const teacherUserId = process.env.TEACHER_USER_ID;

  // For viewer: use service role client to bypass RLS and query teacher's data
  if (isViewer && teacherUserId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    return {
      user,
      userId: teacherUserId,
      role: 'viewer' as string,
      isViewer: true,
      isTeacher: false,
      supabase: adminClient,
    };
  }

  return {
    user,
    userId: user.id,
    role: 'teacher' as string,
    isViewer: false,
    isTeacher: true,
    supabase,
  };
}
