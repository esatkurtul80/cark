import { useState, useEffect } from 'react';
import Wheel from './pages/Wheel';
import Login from './pages/Login';
import Admin from './pages/Admin';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('navigate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('navigate', handleLocationChange);
    };
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('navigate'));
  };

  const getStoreSession = () => {
    const session = localStorage.getItem('store_session');
    return session ? JSON.parse(session) : null;
  };

  const getAdminSession = () => {
    return localStorage.getItem('admin_session') === 'true';
  };

  // Simple routing matrix
  if (currentPath === '/login') {
    if (getStoreSession()) {
      navigate('/');
      return null;
    }
    return <Login navigate={navigate} defaultView="select" />;
  }

  if (currentPath === '/admin/login') {
    if (getAdminSession()) {
      navigate('/admin');
      return null;
    }
    return <Login navigate={navigate} defaultView="admin" />;
  }

  if (currentPath === '/admin') {
    if (!getAdminSession()) {
      navigate('/admin/login');
      return null;
    }
    return <Admin navigate={navigate} />;
  }

  // Root path '/'
  if (!getStoreSession()) {
    navigate('/login');
    return null;
  }
  return <Wheel navigate={navigate} />;
}
