import { useEffect, useState } from "react";
import {
  authClient,
  signIn,
  signUp,
  signOut,
  useSession,
} from "@/client/lib/auth-client";
import { api } from "@/client/lib/api";
import { createNoteSchema, type Note } from "@/shared/schema";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Loader2, LogOut, Trash2 } from "lucide-react";

function GoogleButton() {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
    >
      Continue with Google
    </Button>
  );
}

function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    setLoading(true);
    if (mode === "signin") {
      const res = await signIn.email({ email, password });
      if (res.error) {
        if (res.error.status === 403) {
          setNotice("Please verify your email — we just sent you a new link.");
        } else {
          setError(res.error.message ?? "Sign in failed");
        }
      }
    } else {
      const res = await signUp.email({ email, password, name });
      if (res.error) setError(res.error.message ?? "Sign up failed");
      else setNotice("Account created — check your inbox to verify your email.");
    }
    setLoading(false);
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) return setError("Enter your email above first.");
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setNotice("If that email has an account, a reset link is on its way.");
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            Bun · Hono · Drizzle · Better Auth · React
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleButton />
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          {mode === "signup" && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-muted-foreground text-xs hover:underline"
                  onClick={forgotPassword}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
          <button
            className="text-muted-foreground text-sm hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Have an account? Sign in"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const linkError = params.get("error");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!token) return;
    setError(null);
    setLoading(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (res.error) setError(res.error.message ?? "Could not reset password");
    else setDone(true);
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {linkError || !token ? (
            <p className="text-destructive text-sm">
              This reset link is invalid or has expired. Request a new one from
              the sign-in page.
            </p>
          ) : done ? (
            <p className="text-sm text-emerald-600">
              Password updated. You can now sign in.
            </p>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          {!done && !linkError && token && (
            <Button className="w-full" onClick={submit} disabled={loading || !password}>
              {loading && <Loader2 className="animate-spin" />}
              Set new password
            </Button>
          )}
          <a href="/" className="text-muted-foreground text-sm hover:underline">
            Back to sign in
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}

function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await api.notes.$get();
    if (res.ok) setNotes((await res.json()) as Note[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    const parsed = createNoteSchema.safeParse({ title, body });
    if (!parsed.success) return;
    const res = await api.notes.$post({ json: parsed.data });
    if (res.ok) {
      setTitle("");
      setBody("");
      await load();
    }
  }

  async function remove(id: string) {
    const res = await api.notes[":id"].$delete({ param: { id } });
    if (res.ok) setNotes((n) => n.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>New note</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Body (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={!title.trim()} className="self-start">
            Add note
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notes yet.</p>
      ) : (
        notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div className="grid gap-1">
                <CardTitle>{note.title}</CardTitle>
                {note.body && <CardDescription>{note.body}</CardDescription>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(note.id)}>
                <Trash2 className="size-4" />
              </Button>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}

export default function App() {
  const isResetRoute = window.location.pathname === "/reset-password";
  const { data: session, isPending } = useSession();

  if (isResetRoute) return <ResetPassword />;

  if (isPending) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <AuthCard />;

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your notes</h1>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </header>
      <Notes />
    </div>
  );
}
