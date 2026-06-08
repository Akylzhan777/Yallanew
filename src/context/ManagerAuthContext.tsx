import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'yalla_manager_session';
const CREDENTIALS = { login: 'manageryalla', password: 'YallaEffect' };

interface ManagerAuthContextValue {
  isAuthed: boolean;
  signIn: (login: string, password: string) => boolean;
  signOut: () => void;
}

const ManagerAuthContext = createContext<ManagerAuthContextValue>({
  isAuthed: false,
  signIn: () => false,
  signOut: () => {},
});

export function ManagerAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isAuthed ? 'true' : 'false');
  }, [isAuthed]);

  const signIn = (login: string, password: string): boolean => {
    if (login === CREDENTIALS.login && password === CREDENTIALS.password) {
      setIsAuthed(true);
      return true;
    }
    return false;
  };

  const signOut = () => {
    setIsAuthed(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ManagerAuthContext.Provider value={{ isAuthed, signIn, signOut }}>
      {children}
    </ManagerAuthContext.Provider>
  );
}

export function useManagerAuth() {
  return useContext(ManagerAuthContext);
}
