import { useState, useEffect } from 'react';
import Wheel from './pages/Wheel';
import Login from './pages/Login';
import Admin from './pages/Admin';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Synchronize state with history popstate
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const getStoreSession = () => {
    const session = localStorage.getItem('store_session');
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch (e) {
      localStorage.removeItem('store_session');
      return null;
    }
  };

  const getAdminSession = () => {
    return localStorage.getItem('admin_session') === 'true';
  };

  // Perform redirects in useEffect to prevent rendering side effects
  useEffect(() => {
    const storeSession = getStoreSession();
    const adminSession = getAdminSession();

    if (currentPath === '/login') {
      if (storeSession) {
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
      }
    } else if (currentPath === '/admin/login') {
      if (adminSession) {
        window.history.replaceState({}, '', '/admin');
        setCurrentPath('/admin');
      }
    } else if (currentPath === '/admin') {
      if (!adminSession) {
        window.history.replaceState({}, '', '/admin/login');
        setCurrentPath('/admin/login');
      }
    } else {
      // Default fallback (root '/' or unknown paths)
      if (!storeSession) {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
      }
    }
  }, [currentPath]);

  // Determine what to display based on currentPath and session state
  // This does NOT modify the history during render.
  const storeSession = getStoreSession();
  const adminSession = getAdminSession();

  if (currentPath === '/admin') {
    if (adminSession) {
      return <Admin navigate={navigate} />;
    } else {
      return <Login navigate={navigate} defaultView="admin" />;
    }
  }

  if (currentPath === '/admin/login') {
    if (adminSession) {
      return <Admin navigate={navigate} />;
    } else {
      return <Login navigate={navigate} defaultView="admin" />;
    }
  }

  if (currentPath === '/login') {
    if (storeSession) {
      return <Wheel navigate={navigate} />;
    } else {
      return <Login navigate={navigate} defaultView="select" />;
    }
  }

  // Root path / or unknown paths
  if (storeSession) {
    return <Wheel navigate={navigate} />;
  } else {
    return <Login navigate={navigate} defaultView="select" />;
  }
}

