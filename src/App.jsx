import { useState, useEffect } from 'react';
import Wheel from './pages/Wheel';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { playClick } from './utils/audio';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

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

  // Reactive session states to trigger layout updates immediately
  const [storeSession, setStoreSession] = useState(() => getStoreSession());
  const [adminSession, setAdminSession] = useState(() => getAdminSession());

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
    playClick();
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Perform redirects in useEffect to prevent rendering side effects
  useEffect(() => {
    if (currentPath === '/admin/login') {
      if (adminSession) {
        window.history.replaceState({}, '', '/admin');
        setCurrentPath('/admin');
      }
    } else if (currentPath === '/admin') {
      if (!adminSession) {
        window.history.replaceState({}, '', '/admin/login');
        setCurrentPath('/admin/login');
      }
    } else if (currentPath === '/login') {
      // Clean up any old bookmarks/references to /login by replacing history with root
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
  }, [currentPath, adminSession]);

  const handleStoreLogin = () => {
    setStoreSession(getStoreSession());
  };

  const handleAdminLogin = () => {
    setAdminSession(true);
  };

  const handleStoreLogout = () => {
    localStorage.removeItem('store_session');
    setStoreSession(null);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_session');
    setAdminSession(false);
  };

  // Route Rendering
  if (currentPath === '/admin') {
    if (adminSession) {
      return <Admin navigate={navigate} onLogout={handleAdminLogout} />;
    } else {
      return <Login navigate={navigate} defaultView="admin" onAdminLogin={handleAdminLogin} />;
    }
  }

  if (currentPath === '/admin/login') {
    if (adminSession) {
      return <Admin navigate={navigate} onLogout={handleAdminLogout} />;
    } else {
      return <Login navigate={navigate} defaultView="admin" onAdminLogin={handleAdminLogin} />;
    }
  }

  // Root path '/' or any unknown paths (fallback to store view)
  if (storeSession) {
    return <Wheel navigate={navigate} onLogout={handleStoreLogout} />;
  } else {
    return <Login navigate={navigate} defaultView="select" onLogin={handleStoreLogin} />;
  }
}


