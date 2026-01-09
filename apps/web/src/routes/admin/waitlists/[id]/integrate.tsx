import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  SparklesIcon,
  PlusSignIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useWaitlist, useUpdateWaitlist, type Waitlist, ApiError } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label ? `${label} copied` : "Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={handleCopy}
    >
      <HugeiconsIcon
        icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
        size={14}
        className={copied ? "text-emerald-500" : ""}
      />
    </Button>
  );
}

function CodeBlock({ code, language, label }: { code: string; language?: string; label?: string }) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground font-mono">{language || "code"}</span>
        <CopyButton text={code} label={label} />
      </div>
      <pre className="p-3 overflow-x-auto text-sm">
        <code className="font-mono text-xs">{code}</code>
      </pre>
    </div>
  );
}

export function WaitlistIntegratePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useWaitlist(id!);
  const updateWaitlist = useUpdateWaitlist();
  const showLoading = useDelayedLoading(isLoading);

  const waitlist = data?.waitlist;

  if (showLoading && !waitlist) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
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

  const baseUrl = window.location.origin;
  const signupEndpoint = `${baseUrl}/api/w/${waitlist.slug}/signup`;
  const statusEndpoint = `${baseUrl}/api/w/${waitlist.slug}/status`;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-3xl">
        {/* AI Prompt */}
        <AIPromptCard waitlist={waitlist} baseUrl={baseUrl} />

        {/* Allowed Origins */}
        <AllowedOriginsCard
          waitlist={waitlist}
          onUpdate={(data) => {
            updateWaitlist.mutate(
              { id: waitlist.id, data },
              {
                onSuccess: () => toast.success("Allowed origins saved"),
                onError: (error: Error) => {
                  const message = error instanceof ApiError ? error.message : "Failed to save";
                  toast.error(message);
                },
              }
            );
          }}
          isPending={updateWaitlist.isPending}
        />

        {/* API Reference */}
        <Card>
          <CardHeader>
            <CardTitle>API Reference</CardTitle>
            <CardDescription>
              Complete documentation for integrating this waitlist into your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="signup">
              {/* Signup Endpoint */}
              <AccordionItem value="signup">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">POST</span>
                    Signup Endpoint
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                    <code className="flex-1 text-xs font-mono truncate">{signupEndpoint}</code>
                    <CopyButton text={signupEndpoint} label="Endpoint URL" />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Request body (JSON):</p>
                    <CodeBlock
                      language="json"
                      label="Request body"
                      code={JSON.stringify({
                        email: "user@example.com",
                        referralSource: "landing-page",
                        ...(waitlist.customFields?.length ? {
                          customData: Object.fromEntries(
                            waitlist.customFields.map(f => [f.key, `<${f.label}>`])
                          )
                        } : {})
                      }, null, 2)}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Success response:</p>
                    <CodeBlock
                      language="json"
                      label="Response"
                      code={JSON.stringify({
                        success: true,
                        message: waitlist.doubleOptIn
                          ? "Please check your email to confirm your spot."
                          : "You're on the list!",
                        position: 47,
                        requiresConfirmation: waitlist.doubleOptIn,
                        redirectUrl: waitlist.redirectUrl || null
                      }, null, 2)}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Error response:</p>
                    <CodeBlock
                      language="json"
                      label="Error response"
                      code={JSON.stringify({
                        error: {
                          code: "ALREADY_SIGNED_UP",
                          message: "This email is already on the waitlist"
                        }
                      }, null, 2)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Status Endpoint */}
              <AccordionItem value="status">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">GET</span>
                    Status Endpoint
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                    <code className="flex-1 text-xs font-mono truncate">{statusEndpoint}</code>
                    <CopyButton text={statusEndpoint} label="Endpoint URL" />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Response:</p>
                    <CodeBlock
                      language="json"
                      label="Response"
                      code={JSON.stringify({
                        name: waitlist.name,
                        slug: waitlist.slug,
                        logoUrl: waitlist.logoUrl,
                        primaryColor: waitlist.primaryColor,
                        customFields: waitlist.customFields,
                        signupCount: 142
                      }, null, 2)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Code Examples */}
              <AccordionItem value="examples">
                <AccordionTrigger className="text-sm font-medium">
                  Code Examples
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div>
                    <p className="text-sm font-medium mb-2">JavaScript / TypeScript</p>
                    <CodeBlock
                      language="typescript"
                      label="TypeScript example"
                      code={`async function joinWaitlist(email: string) {
  const response = await fetch("${signupEndpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      referralSource: "website"${waitlist.customFields?.length ? `,
      customData: {
        ${waitlist.customFields.map(f => `${f.key}: "value"`).join(',\n        ')}
      }` : ''}
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to join");
  }

  return data;
}`}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">React Form Example</p>
                    <CodeBlock
                      language="tsx"
                      label="React example"
                      code={`function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("${signupEndpoint}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to join");
      }

      setStatus("success");
      setMessage(data.message);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (status === "success") {
    return <p className="text-green-600">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
      {status === "error" && <p className="text-red-600">{message}</p>}
    </form>
  );
}`}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">cURL</p>
                    <CodeBlock
                      language="bash"
                      label="cURL example"
                      code={`curl -X POST "${signupEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com"}'`}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function AIPromptCard({ waitlist, baseUrl }: { waitlist: Waitlist; baseUrl: string }) {
  const [copied, setCopied] = useState(false);

  const prompt = generateAIPrompt(waitlist, baseUrl);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("AI prompt copied! Paste it into Claude Code, Cursor, or your favorite AI assistant.");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={SparklesIcon} size={18} className="text-primary" />
          AI-Assisted Integration
        </CardTitle>
        <CardDescription>
          Copy this prompt and paste it into Claude Code, Cursor, OpenCode, or any AI coding assistant to automatically integrate the waitlist into your project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background p-3 mb-3">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {prompt.slice(0, 500)}...
          </pre>
        </div>
        <Button onClick={handleCopy} className="w-full">
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            size={16}
            className="mr-2"
          />
          {copied ? "Copied!" : "Copy AI Prompt"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AllowedOriginsCard({
  waitlist,
  onUpdate,
  isPending,
}: {
  waitlist: Waitlist;
  onUpdate: (data: Partial<Waitlist>) => void;
  isPending: boolean;
}) {
  const [origins, setOrigins] = useState<string[]>(waitlist.allowedOrigins || []);
  const [newOrigin, setNewOrigin] = useState("");

  const addOrigin = () => {
    const trimmed = newOrigin.trim();
    if (trimmed && !origins.includes(trimmed)) {
      setOrigins([...origins, trimmed]);
      setNewOrigin("");
    }
  };

  const removeOrigin = (index: number) => {
    setOrigins(origins.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate({ allowedOrigins: origins });
  };

  const hasChanges = JSON.stringify(origins) !== JSON.stringify(waitlist.allowedOrigins || []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Allowed Origins (CORS)
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <HugeiconsIcon icon={InformationCircleIcon} size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Restrict which websites can submit to this waitlist. Leave empty to allow all origins. Supports wildcards like <code>*.example.com</code>.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>
          {origins.length === 0
            ? "All origins are currently allowed. Add domains to restrict access."
            : `Only requests from these ${origins.length} origin(s) will be accepted.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current origins */}
        {origins.length > 0 && (
          <div className="space-y-2">
            {origins.map((origin, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border"
              >
                <code className="flex-1 text-xs font-mono">{origin}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => removeOrigin(index)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new origin */}
        <div className="flex gap-2">
          <Input
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="example.com or *.example.com"
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOrigin();
              }
            }}
          />
          <Button variant="outline" size="icon" onClick={addOrigin} disabled={!newOrigin.trim()}>
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Examples: <code className="bg-muted px-1 rounded">example.com</code>, <code className="bg-muted px-1 rounded">*.example.com</code>, <code className="bg-muted px-1 rounded">https://app.example.com</code>
        </p>

        {hasChanges && (
          <Button onClick={handleSave} loading={isPending}>
            Save Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function generateAIPrompt(waitlist: Waitlist, baseUrl: string): string {
  const signupEndpoint = `${baseUrl}/api/w/${waitlist.slug}/signup`;

  const customFieldsInfo = waitlist.customFields?.length
    ? `\n\nCustom fields to collect:\n${waitlist.customFields.map(f => `- ${f.key}: ${f.label} (${f.type}${f.required ? ', required' : ''})`).join('\n')}`
    : '';

  return `Add a waitlist signup form to my landing page that integrates with my waitlist API.

## API Details

**Endpoint:** POST ${signupEndpoint}

**Request body (JSON):**
\`\`\`json
{
  "email": "user@example.com",
  "referralSource": "landing-page"${waitlist.customFields?.length ? `,
  "customData": {
    ${waitlist.customFields.map(f => `"${f.key}": "value"`).join(',\n    ')}
  }` : ''}
}
\`\`\`

**Success response:**
\`\`\`json
{
  "success": true,
  "message": "${waitlist.doubleOptIn ? 'Please check your email to confirm your spot.' : "You're on the list!"}",
  "position": 47,
  "requiresConfirmation": ${waitlist.doubleOptIn}
}
\`\`\`

**Error response:**
\`\`\`json
{
  "error": {
    "code": "ALREADY_SIGNED_UP",
    "message": "This email is already on the waitlist"
  }
}
\`\`\`
${customFieldsInfo}

## Requirements

1. Create a clean, minimal signup form with:
   - Email input field${waitlist.customFields?.length ? '\n   - Fields for: ' + waitlist.customFields.map(f => f.label).join(', ') : ''}
   - Submit button with loading state
   - Success message showing the user's position
   - Error handling for validation and duplicate emails

2. Style the form to match the existing design system. Use these brand colors:
   - Primary color: ${waitlist.primaryColor || '#6366f1'}

3. The form should:
   - Validate email format before submitting
   - Show a loading spinner during submission
   - Display the success message from the API response
   - Handle errors gracefully with user-friendly messages

4. Make sure to handle CORS - the API accepts requests from allowed origins only.`;
}

export { WaitlistIntegratePage as default };
