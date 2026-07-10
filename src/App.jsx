import { useState, useEffect } from 'react';
import Wheel from './pages/Wheel';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Screensaver from './pages/Screensaver';
import { playClick } from './utils/audio';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
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

  // Convert pathname to hash on initial startup for backwards compatibility
  const getInitialPath = () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) return hash; // e.g. '#/admin'
    const path = window.location.pathname;
    if (path === '/admin') return '#/admin';
    if (path === '/admin/login') return '#/login';
    return '#/';
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath);
  const [storeSession, setStoreSession] = useState(() => getStoreSession());
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  // Admin preview: show the wheel WITHOUT any URL/hash change to avoid kiosk browser issues
  const [adminPreviewWheel, setAdminPreviewWheel] = useState(false);
  // Screensaver: product showcase after 30s of inactivity (only on store/wheel routes)
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);

  // Real-time screensaver toggles from Firebase settings & store settings
  const [globalScreensaverEnabled, setGlobalScreensaverEnabled] = useState(true);
  const [storeScreensaverEnabled, setStoreScreensaverEnabled] = useState(true);

  // Listen to global screensaver settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'screensaver'), (docSnap) => {
      if (docSnap.exists()) {
        setGlobalScreensaverEnabled(docSnap.data().enabled !== false);
      } else {
        setGlobalScreensaverEnabled(true);
      }
    }, (err) => {
      console.error("Error loading global screensaver setting:", err);
    });
    return () => unsub();
  }, []);

  // Listen to store-specific screensaver setting
  useEffect(() => {
    if (!storeSession?.id) {
      setStoreScreensaverEnabled(true);
      return;
    }
    const unsub = onSnapshot(doc(db, 'stores', storeSession.id), (docSnap) => {
      if (docSnap.exists()) {
        setStoreScreensaverEnabled(docSnap.data().screensaver_enabled !== false);
      } else {
        setStoreScreensaverEnabled(true);
      }
    }, (err) => {
      console.error("Error loading store screensaver setting:", err);
    });
    return () => unsub();
  }, [storeSession]);

  // ─── SCREENSAVER: 30 seconds of inactivity on non-admin routes ───
  useEffect(() => {
    const isAdminRoute = currentPath.startsWith('#/admin');
    if (isAdminRoute || !globalScreensaverEnabled || !storeScreensaverEnabled) {
      setIsScreensaverActive(false);
      return;
    }

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScreensaverActive(true);
      }, 30000); // 30 seconds
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [currentPath, globalScreensaverEnabled, storeScreensaverEnabled]);

  // ─── AUTO-UPDATE: Poll version.json every 60s, hard reload on new deploy ───
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const storedVersion = sessionStorage.getItem('app_version');
        if (!storedVersion) {
          sessionStorage.setItem('app_version', data.version);
        } else if (storedVersion !== data.version) {
          // New deployment detected → hard reload to get latest code
          sessionStorage.setItem('app_version', data.version);
          window.location.reload();
        }
      } catch (e) {
        // Offline or fetch error — silently ignore
      }
    };

    checkVersion(); // Check immediately on load
    const interval = setInterval(checkVersion, 60 * 1000); // Re-check every 60s
    return () => clearInterval(interval);
  }, []);

  // ─── HASH ROUTING: Sync state with hashchange events ───
  useEffect(() => {
    // If loaded via old pathname URL, convert to hash
    const path = window.location.pathname;
    if (path !== '/') {
      window.history.replaceState({}, '', '/');
      window.location.hash = path === '/admin' ? '#/admin' : '#/login';
    }

    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (path) => {
    playClick();
    const hashPath = path.startsWith('#') ? path : `#${path}`;
    window.location.hash = hashPath;
    setCurrentPath(hashPath);
  };

  // ─── REDIRECT GUARDS ───
  useEffect(() => {
    const hasAdminSession = localStorage.getItem('admin_session') === 'true';
    const hasStoreSession = !!localStorage.getItem('store_session');

    if (currentPath === '#/admin') {
      if (!hasAdminSession) {
        window.location.hash = '#/login';
        setCurrentPath('#/login');
      }
      setAdminPreviewWheel(false);
    } else if (currentPath === '#/login') {
      if (hasAdminSession) {
        window.location.hash = '#/admin';
        setCurrentPath('#/admin');
      } else if (hasStoreSession) {
        window.location.hash = '#/';
        setCurrentPath('#/');
      }
    } else if (currentPath === '#/') {
      if (!hasStoreSession && !hasAdminSession) {
        window.location.hash = '#/login';
        setCurrentPath('#/login');
      } else if (hasAdminSession) {
        window.location.hash = '#/admin';
        setCurrentPath('#/admin');
      }
    }
  }, [currentPath, adminSession, storeSession]);

  const handleStoreLogin = () => {
    localStorage.removeItem('admin_session');
    setAdminSession(false);
    setStoreSession(getStoreSession());
  };

  const handleAdminLogin = () => {
    localStorage.removeItem('store_session');
    setStoreSession(null);
    localStorage.setItem('admin_session', 'true');
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

  // ─── ROUTE RENDERING ───
  const hasAdmin = adminSession || localStorage.getItem('admin_session') === 'true';
  const hasStore = !!storeSession;

  // Screensaver overlay (only on non-admin routes)
  const isAdminRoute = currentPath.startsWith('#/admin');
  if (isScreensaverActive && !isAdminRoute) {
    return <Screensaver onClose={() => setIsScreensaverActive(false)} />;
  }

  // Unified Login route
  if (currentPath === '#/login') {
    return (
      <Login
        navigate={navigate}
        onLogin={handleStoreLogin}
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  // Admin routes
  if (currentPath === '#/admin') {
    if (hasAdmin) {
      if (adminPreviewWheel) {
        return (
          <Wheel
            navigate={navigate}
            onLogout={handleAdminLogout}
            isAdminPreview={true}
            previewStoreId={typeof adminPreviewWheel === 'string' ? adminPreviewWheel : 'admin_preview'}
            onBackToAdmin={() => setAdminPreviewWheel(false)}
          />
        );
      }
      return (
        <Admin
          navigate={navigate}
          onLogout={handleAdminLogout}
          onPreviewWheel={(storeId) => setAdminPreviewWheel(storeId || true)}
        />
      );
    }
    return (
      <Login
        navigate={navigate}
        onLogin={handleStoreLogin}
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  // Root path '#/' — store kiosk
  if (hasStore) {
    return <Wheel navigate={navigate} onLogout={handleStoreLogout} />;
  }

  // If an admin somehow ends up at '#/', redirect to admin panel
  if (hasAdmin) {
    return (
      <Admin
        navigate={navigate}
        onLogout={handleAdminLogout}
        onPreviewWheel={() => setAdminPreviewWheel(true)}
      />
    );
  }

  // Default fallback if path is unknown or not matched
  return (
    <Login
      navigate={navigate}
      onLogin={handleStoreLogin}
      onAdminLogin={handleAdminLogin}
    />
  );
}
