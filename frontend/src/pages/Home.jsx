import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyProfile } from '../api/profiles.js';

export default function Home() {
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    getMyProfile()
      .then((profile) => setHasProfile(!!profile))
      .finally(() => setCheckingProfile(false));
  }, [user, loading]);

  if (loading || checkingProfile) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={hasProfile ? '/dashboard' : '/profile-setup'} replace />;
}
