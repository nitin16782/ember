import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function MagicLinkRequest() {
  const { requestMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If an account exists for ${email}, a sign-in link is on its way. It expires in 15 minutes.`}
        footer={<Link href="/login" className="text-[#1A3A5C] hover:underline">Back to sign in</Link>}
      >
        <div className="text-sm text-[#5C5C5C] text-center py-4">
          Didn't get it? Check your spam folder, or
          <button onClick={() => setSent(false)} className="ml-1 text-[#1A3A5C] hover:underline">
            try a different email
          </button>.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Email a sign-in link"
      subtitle="We'll send a one-tap link to your email"
      footer={<Link href="/login" className="text-[#1A3A5C] hover:underline">Use password instead</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email" type="email" required autoFocus autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send sign-in link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
