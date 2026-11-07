import { Slot } from "expo-router";
import { AuthShell } from "@/components/auth-shell";

export default function AuthLayout() {
  return (
    <AuthShell>
      <Slot />
    </AuthShell>
  );
}
