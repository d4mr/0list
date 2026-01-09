import { useState } from "react";
import { useParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoModeButton } from "@/components/demo-mode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useWaitlist, useAuth } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { toast } from "sonner";

interface SignupResponse {
  success: boolean;
  message: string;
  position?: number;
  requiresConfirmation?: boolean;
  redirectUrl?: string | null;
  error?: string;
}

export function WaitlistTesterPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useWaitlist(id!);
  const { data: authData } = useAuth();
  const showLoading = useDelayedLoading(isLoading);
  const waitlist = data?.waitlist;
  const transactionalEmailEnabled = authData?.transactionalEmailEnabled ?? false;

  const [email, setEmail] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<SignupResponse | null>(null);

  const handleCustomDataChange = (key: string, value: string) => {
    setCustomData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlist) return;

    setIsSubmitting(true);
    setResponse(null);

    try {
      const res = await fetch(`/api/w/${waitlist.slug}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referralSource: referralSource || undefined,
          customData: Object.keys(customData).length > 0 ? customData : undefined,
        }),
      });

      const data = await res.json();
      setResponse(data);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      setResponse({ success: false, message: errorMessage, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setReferralSource("");
    setCustomData({});
    setResponse(null);
  };

  const copySignupPayload = () => {
    const payload = {
      email,
      ...(referralSource && { referralSource }),
      ...(Object.keys(customData).length > 0 && { customData }),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Payload copied to clipboard");
  };

  if (showLoading && !waitlist) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Error handled by parent layout
  if (isError || (!isLoading && !waitlist)) {
    return null;
  }

  if (!waitlist) {
    return null;
  }

  const customFields = waitlist.customFields || [];
  const signupUrl = `/api/w/${waitlist.slug}/signup`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Signup form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Signup</CardTitle>
            <CardDescription>
              Submit a test signup to verify your waitlist is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  required
                />
              </div>

              {customFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.key}
                      value={customData[field.key] || ""}
                      onChange={(e) => handleCustomDataChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  ) : (
                    <Input
                      id={field.key}
                      value={customData[field.key] || ""}
                      onChange={(e) => handleCustomDataChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="referralSource">
                  Referral source
                  <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
                </Label>
                <Input
                  id="referralSource"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  placeholder="e.g., twitter, producthunt, friend"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <DemoModeButton type="submit" loading={isSubmitting}>
                  Submit signup
                </DemoModeButton>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} className="mr-2" />
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* API info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 font-mono text-sm">
              <Badge variant="secondary" className="shrink-0">POST</Badge>
              <code className="truncate flex-1">{signupUrl}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + signupUrl);
                  toast.success("URL copied");
                }}
              >
                <HugeiconsIcon icon={Copy01Icon} size={14} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={copySignupPayload} className="w-full">
              <HugeiconsIcon icon={Copy01Icon} size={14} className="mr-2" />
              Copy request payload
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Response panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              API response from the signup endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="space-y-4">
                {/* Status indicator */}
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg ${
                    response.success
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <HugeiconsIcon
                    icon={response.success ? CheckmarkCircle02Icon : Alert02Icon}
                    size={24}
                  />
                  <div>
                    <p className="font-medium">
                      {response.success ? "Signup successful" : "Signup failed"}
                    </p>
                    <p className="text-sm opacity-80">{response.message}</p>
                  </div>
                </div>

                {/* Details */}
                {response.success && (
                  <div className="space-y-2">
                    {response.position && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Position</span>
                        <span className="font-mono font-medium">#{response.position}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Requires confirmation</span>
                      <span className="font-medium">
                        {response.requiresConfirmation ? "Yes" : "No"}
                      </span>
                    </div>
                    {response.redirectUrl && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Redirect URL</span>
                        <span className="font-mono text-sm truncate max-w-48">
                          {response.redirectUrl}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw JSON */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Raw response</p>
                  <pre className="p-3 rounded-md bg-muted/50 text-xs overflow-auto max-h-48 font-mono">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <HugeiconsIcon icon={InformationCircleIcon} size={24} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Submit a test signup to see the API response
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                {waitlist.doubleOptIn && transactionalEmailEnabled
                  ? "Double opt-in is active — a confirmation email will be sent"
                  : waitlist.doubleOptIn && !transactionalEmailEnabled
                  ? "Double opt-in is enabled but transactional email is not configured — signups will be confirmed immediately"
                  : "Double opt-in is disabled — signups are confirmed immediately"}
              </li>
              <li className="flex gap-2">
                <span className={transactionalEmailEnabled ? "text-success" : "text-warning"}>•</span>
                {transactionalEmailEnabled
                  ? "Transactional email is configured — confirmation and welcome emails will be sent"
                  : "Transactional email not configured — no emails will be sent"}
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Test submissions count as real signups
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { WaitlistTesterPage as default };
