import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ProfileState, ProfileStore } from './ProfileStore';

const ProfileContext = createContext<ProfileStore | null>(null);

export function ProfileProvider(props: { store: ProfileStore; children: ReactNode }) {
  return <ProfileContext.Provider value={props.store}>{props.children}</ProfileContext.Provider>;
}

export function useProfileStore(): ProfileStore {
  const store = useContext(ProfileContext);
  if (!store) throw new Error('useProfileStore must be used inside ProfileProvider');
  return store;
}

export function useProfileState(): ProfileState {
  const store = useProfileStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
