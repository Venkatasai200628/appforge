// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import {
  signInWithPopup, signOut, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  deleteUser, reauthenticateWithPopup, EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';
import { clearUserLocalData, withTimeout } from '@/lib/accountCleanup';
import { doc, setDoc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { loadLocalProjects, saveLocalProjects } from '@/lib/projectsStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const setUser            = useStore(s => s.setUser);
  const setApps            = useStore(s => s.setApps);
  const setAuthLoading     = useStore(s => s.setAuthLoading);
  const setRegisteredUsers = useStore(s => s.setRegisteredUsers);
  const hydrateAppsFromLocal = useStore(s => s.hydrateAppsFromLocal);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Save/update profile in Firestore (non-blocking)
        const userRef = doc(db, 'users', firebaseUser.uid);
        getDoc(userRef).then(snap => {
          const invitedBy = (() => {
            try { return sessionStorage.getItem('af_invite_ref') || null; } catch { return null; }
          })();
          if (!snap?.exists()) {
            setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'user',
              invitedBy: invitedBy || null,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          } else if (invitedBy && !snap.data()?.invitedBy) {
            setDoc(userRef, { invitedBy }, { merge: true }).catch(() => {});
          }
          try { sessionStorage.removeItem('af_invite_ref'); } catch {}
        }).catch(() => {});

        setUser(firebaseUser);
        setAuthLoading(false);   // ← unblock UI immediately

        // Load projects: local first (instant), then merge Firestore
        const localApps = hydrateAppsFromLocal(firebaseUser.uid);
        try {
          const q = query(
            collection(db, 'apps'),
            where('uid', '==', firebaseUser.uid)
          );
          const snap2 = await getDocs(q);
          const cloudApps = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
          const byId = new Map();
          localApps.forEach(a => byId.set(a.id, a));
          cloudApps.forEach(a => {
            const existing = byId.get(a.id);
            if (!existing || new Date(a.updatedAt || a.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
              byId.set(a.id, a);
            }
          });
          const merged = [...byId.values()].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
          setApps(merged);
          saveLocalProjects(firebaseUser.uid, merged);
        } catch {
          setApps(localApps);
        }

        // Load all registered users for generated-app admin dashboards
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const users = usersSnap.docs.map(d => ({
            id: d.id,
            name: d.data().displayName || d.data().email?.split('@')[0] || 'User',
            email: d.data().email || '',
            role: d.data().role || 'user',
            status: 'Active',
            createdAt: d.data().createdAt,
          }));
          setRegisteredUsers(users);
        } catch {
          setRegisteredUsers([]);
        }
      } else {
        setUser(null);
        hydrateAppsFromLocal('guest');
        setRegisteredUsers([]);
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signUpWithEmail = async (email, password, extra = {}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const invitedBy = extra.invitedBy || (() => {
      try { return sessionStorage.getItem('af_invite_ref'); } catch { return null; }
    })();
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: email.split('@')[0],
      photoURL: null,
      role: 'user',
      invitedBy: invitedBy || null,
      teamName: extra.teamName || null,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
    try { sessionStorage.removeItem('af_invite_ref'); } catch {}
    return cred;
  };
  const logout = async () => { await signOut(auth); };

  const deleteAccount = async (passwordForReauth = '') => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('You are not signed in.');

    const providerId = firebaseUser.providerData[0]?.providerId || 'password';

    if (providerId === 'google.com') {
      await reauthenticateWithPopup(firebaseUser, googleProvider);
    } else if (providerId === 'password') {
      if (!passwordForReauth?.trim()) {
        throw new Error('REAUTH_PASSWORD_NEEDED');
      }
      const cred = EmailAuthProvider.credential(firebaseUser.email, passwordForReauth);
      await reauthenticateWithCredential(firebaseUser, cred);
    }

    const uid = firebaseUser.uid;
    clearUserLocalData(uid);

    try {
      const snap = await withTimeout(
        getDocs(query(collection(db, 'apps'), where('uid', '==', uid))),
        15000,
        'Loading your projects'
      );
      await Promise.allSettled(
        snap.docs.map(d => withTimeout(deleteDoc(doc(db, 'apps', d.id)), 8000, 'Delete project'))
      );
    } catch {
      // Continue — local data already cleared
    }

    try {
      await withTimeout(deleteDoc(doc(db, 'users', uid)), 8000, 'Delete profile');
    } catch {}

    await deleteUser(firebaseUser);
    await signOut(auth);
  };

  const saveUserProfile = async (uid, patch) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid), patch, { merge: true });
  };

  return (
    <AuthContext.Provider value={{
      loginWithGoogle, loginWithEmail, signUpWithEmail, logout, deleteAccount, saveUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
