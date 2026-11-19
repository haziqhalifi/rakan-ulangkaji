import { createContext, useContext, type ReactNode } from 'react';
import type { Route } from './router';

export type NavigateFn = (route: Route) => void;

const NavigationContext = createContext<NavigateFn | null>(null);

/** The Shell supplies navigate(), so features never import each other to link across modes. */
export function NavigationProvider(props: { navigate: NavigateFn; children: ReactNode }) {
  return <NavigationContext.Provider value={props.navigate}>{props.children}</NavigationContext.Provider>;
}

export function useNavigate(): NavigateFn {
  const fn = useContext(NavigationContext);
  if (!fn) throw new Error('useNavigate must be used inside NavigationProvider');
  return fn;
}
