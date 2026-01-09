import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowReloadHorizontalIcon,
  InformationCircleIcon,
  SourceCodeIcon,
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
import { useWaitlist, useUpdateWaitlist, getEmailPreviewUrl, type Waitlist, ApiError } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";

const TEMPLATES = [
  {
    id: "confirmation",
    name: "Confirmation",
    description: "Sent when a user signs up (double opt-in)",
    subjectField: "emailSubjectConfirmation" as const,
    defaultSubject: "Confirm your spot on the waitlist",
  },
  {
    id: "welcome",
    name: "Welcome",
    description: "Sent after email confirmation",
    subjectField: "emailSubjectWelcome" as const,
    defaultSubject: "You're on the waitlist!",
  },
  {
    id: "admin-notification",
    name: "Admin Notification",
    description: "Sent to admin on new signups",
    subjectField: null,
    defaultSubject: null,
  },
] as const;

type SubjectField = "emailSubjectConfirmation" | "emailSubjectWelcome";

function getSubjectLine(
  template: typeof TEMPLATES[number] | undefined,
  waitlist: Waitlist,
  sampleData: { email: string; position: string }
): string {
  if (!template) return "Email Preview";

  switch (template.id) {
    case "confirmation":
      return waitlist.emailSubjectConfirmation || template.defaultSubject || "Confirm your spot on the waitlist";
    case "welcome":
      return waitlist.emailSubjectWelcome || template.defaultSubject || "You're on the waitlist!";
    case "admin-notification":
      return `New signup #${sampleData.position}: ${sampleData.email}`;
  }
}

export function WaitlistEmailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useWaitlist(id!);
  const updateWaitlist = useUpdateWaitlist();
  const showLoading = useDelayedLoading(isLoading);
  const [activeTemplate, setActiveTemplate] = useState<string>("confirmation");
  const [previewKey, setPreviewKey] = useState(0);

  // Preview sample data
  const [sampleEmail, setSampleEmail] = useState("test@example.com");
  const [samplePosition, setSamplePosition] = useState("47");

  const waitlist = data?.waitlist;

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  const currentTemplate = TEMPLATES.find((t) => t.id === activeTemplate);

  if (showLoading && !waitlist) {
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
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

  const handleSubjectUpdate = (subjectField: SubjectField, value: string | null) => {
    updateWaitlist.mutate(
      { id: waitlist.id, data: { [subjectField]: value } },
      {
        onSuccess: () => toast.success("Subject saved"),
        onError: (error: Error) => {
          const message = error instanceof ApiError ? error.message : "Failed to save";
          toast.error(message);
        },
      }
    );
  };

  return (
    <TooltipProvider>
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Template selector & settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setActiveTemplate(template.id)}
                    className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                      activeTemplate === template.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Subject customization */}
            {currentTemplate?.subjectField && (
              <SubjectEditor
                waitlist={waitlist}
                subjectField={currentTemplate.subjectField}
                defaultSubject={currentTemplate.defaultSubject}
                onUpdate={handleSubjectUpdate}
                isPending={updateWaitlist.isPending}
              />
            )}

            {/* Sample data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preview Data</CardTitle>
                <CardDescription>
                  Sample data for email preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sampleEmail" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="sampleEmail"
                    value={sampleEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSampleEmail(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="samplePosition" className="text-xs">
                    Position
                  </Label>
                  <Input
                    id="samplePosition"
                    type="number"
                    value={samplePosition}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSamplePosition(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={refreshPreview}
                >
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={12} className="mr-2" />
                  Refresh preview
                </Button>
              </CardContent>
            </Card>

            {/* Branding */}
            <BrandingSettings
              waitlist={waitlist}
              onUpdate={(data) => {
                updateWaitlist.mutate(
                  { id: waitlist.id, data },
                  {
                    onSuccess: () => {
                      toast.success("Branding saved");
                      refreshPreview();
                    },
                    onError: (error: Error) => {
                      const message = error instanceof ApiError ? error.message : "Failed to save";
                      toast.error(message);
                    },
                  }
                );
              }}
              isPending={updateWaitlist.isPending}
            />

            {/* Template customization info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <HugeiconsIcon icon={SourceCodeIcon} size={16} />
                  Custom Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Email templates can be fully customized by editing the source files at{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">
                    src/emails/templates/
                  </code>
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">confirmation.tsx</code>
                    {" "}- Double opt-in
                  </p>
                  <p>
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">welcome.tsx</code>
                    {" "}- Post-confirmation
                  </p>
                  <p>
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">admin-notification.tsx</code>
                    {" "}- Admin alerts
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email preview */}
          <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-14rem)]">
            <Card className="overflow-hidden h-full flex flex-col">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className="bg-[#f6f9fc] dark:bg-neutral-900 p-6 flex-1 flex flex-col min-h-0">
                  <div className="mx-auto w-full max-w-[600px] rounded-lg border border-border bg-white dark:bg-neutral-950 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                    {/* Gmail-like email header */}
                    <div className="border-b border-border p-4 space-y-3 shrink-0">
                      <h2 className="text-lg font-semibold text-foreground">
                        {getSubjectLine(currentTemplate, waitlist, { email: sampleEmail, position: samplePosition })}
                      </h2>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-semibold text-sm">
                            {waitlist.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{waitlist.name}</span>
                            <span className="text-xs text-muted-foreground">
                              &lt;noreply@waitlist.example.com&gt;
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            to {sampleEmail}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          Just now
                        </div>
                      </div>
                    </div>
                    {/* Email content */}
                    <iframe
                      key={previewKey}
                      src={getEmailPreviewUrl(id!, activeTemplate, {
                        email: sampleEmail,
                        position: parseInt(samplePosition) || 47,
                      })}
                      className="w-full flex-1 min-h-0"
                      title="Email preview"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
    </TooltipProvider>
  );
}

function SubjectEditor({
  waitlist,
  subjectField,
  defaultSubject,
  onUpdate,
  isPending,
}: {
  waitlist: Waitlist;
  subjectField: SubjectField;
  defaultSubject: string;
  onUpdate: (subjectField: SubjectField, value: string | null) => void;
  isPending: boolean;
}) {
  const [subject, setSubject] = useState(waitlist[subjectField] || "");

  const handleSave = () => {
    onUpdate(subjectField, subject || null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Subject Line</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Input
            value={subject}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
            placeholder={defaultSubject}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Default: {defaultSubject}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} loading={isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <HugeiconsIcon icon={InformationCircleIcon} size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function BrandingSettings({
  waitlist,
  onUpdate,
  isPending,
}: {
  waitlist: Waitlist;
  onUpdate: (data: Partial<Waitlist>) => void;
  isPending: boolean;
}) {
  const [logoUrl, setLogoUrl] = useState(waitlist.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(
    waitlist.primaryColor || "#6366f1"
  );

  const handleSave = () => {
    onUpdate({ logoUrl: logoUrl || undefined, primaryColor });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Branding</CardTitle>
        <CardDescription>
          Logo and colors used in email templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="logoUrl" className="text-xs">Logo URL</Label>
            <InfoTooltip>
              Your logo will appear in emails. Use a square image (at least 200x200px) for best results.
            </InfoTooltip>
          </div>
          <Input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLogoUrl(e.target.value)
            }
            placeholder="https://example.com/logo.png"
            className="h-8 text-sm"
          />
          {logoUrl && (
            <div className="mt-2 rounded-md border border-border p-2 bg-muted/30">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryColor" className="text-xs">Brand Color</Label>
          <div className="flex items-center gap-2">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrimaryColor(e.target.value)
              }
              className="h-8 w-12 cursor-pointer p-1"
            />
            <Input
              value={primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrimaryColor(e.target.value)
              }
              placeholder="#6366f1"
              className="flex-1 h-8 font-mono text-sm"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} loading={isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export { WaitlistEmailsPage as default };
