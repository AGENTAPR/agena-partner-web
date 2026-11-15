import type { AuthContextValue } from "./types";
import { createContext, type ReactNode, useContext } from "react";

const AuthContext = createContext<AuthContextValue>({
  mode: "mock",
  state: "ANONYMOUS",
  partner: null,
});

export function AuthProvider({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
