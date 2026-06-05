import { useState } from "react";
import { UserIcon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";

type Mode = "signin" | "signup";

export function AuthMenu() {
  const session = useUserStore((s) => s.session);
  const signInWithPassword = useUserStore((s) => s.signInWithPassword);
  const signUp = useUserStore((s) => s.signUp);
  const signOut = useUserStore((s) => s.signOut);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setMode("signin");
    setEmail("");
    setPassword("");
    setInfo(null);
    setError(null);
  }

  if (session) {
    const userEmail = session.user.email ?? "Signed in";
    return (
      <div className="flex items-center gap-1">
        <span className="hidden max-w-[16ch] truncate text-sm text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          aria-label="Sign out"
        >
          <LogOutIcon className="size-4" />
          <span className="ml-1 hidden sm:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm(); // reset each time the dialog closes
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <UserIcon className="size-4" />
        <span className="ml-1 hidden sm:inline">Sign in</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Sign in" : "Create account"}</DialogTitle>
        </DialogHeader>
        {info ? (
          <p className="text-sm">{info}</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (mode === "signin") {
                const { error: err } = await signInWithPassword(email, password);
                if (err) setError(err);
                // On success the auth listener flips to the signed-in view.
              } else {
                const { error: err, needsConfirmation } = await signUp(email, password);
                if (err) setError(err);
                else if (needsConfirmation)
                  setInfo("Check your inbox to confirm your account, then sign in.");
                // If no confirmation needed, signUp returns a session and the
                // auth listener flips to the signed-in view.
              }
            }}
          >
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode((m) => (m === "signin" ? "signup" : "signin"));
                setError(null);
              }}
            >
              {mode === "signin"
                ? "No account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
