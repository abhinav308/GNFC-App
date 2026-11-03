import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

// A URL behind a guard the current user doesn't pass (e.g. "/" while logged out, or "/login" right after signing in)
// lands here. Send them to the screen they should see.
export default function NotFound() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (user.must_change_password) return <Redirect href={"/set-password" as never} />;
  return <Redirect href={user.role === 'USER' ? '/' : '/overview'} />;
}
