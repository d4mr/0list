import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  InformationCircleIcon,
  LinkSquare02Icon,
  Copy01Icon,
  Alert02Icon,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useWaitlist,
  useUpdateWaitlist,
  useAuth,
  type Waitlist,
  type CustomField,
  ApiError,
} from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { useState } from "react";

export function WaitlistSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useWaitlist(id!);
  const { data: authData } = useAuth();
  const updateWaitlist = useUpdateWaitlist();
  const showLoading = useDelayedLoading(isLoading);

  const waitlist = data?.waitlist;
  const transactionalEmailEnabled = authData?.transactionalEmailEnabled ?? false;

  if (showLoading && !waitlist) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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

  const handleUpdate = (data: Partial<Waitlist>, successMessage: string) => {
    updateWaitlist.mutate(
      { id: waitlist.id, data },
      {
        onSuccess: () => toast.success(successMessage),
        onError: (error: Error) => {
          const message =
            error instanceof ApiError ? error.message : "Failed to save";
          toast.error(message);
        },
      }
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-3xl">
        <GeneralSettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
        />
        <Separator />
        <BrandingSettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
        />
        <Separator />
        <BehaviorSettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
          transactionalEmailEnabled={transactionalEmailEnabled}
        />
        <Separator />
        <CustomFieldsSettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
        />
        <Separator />
        <NotificationSettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
        />
        <Separator />
        <SecuritySettings
          waitlist={waitlist}
          onUpdate={handleUpdate}
          isPending={updateWaitlist.isPending}
        />
      </div>
    </TooltipProvider>
  );
}

interface SettingsSectionProps {
  waitlist: Waitlist;
  onUpdate: (data: Partial<Waitlist>, successMessage: string) => void;
  isPending: boolean;
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

function GeneralSettings({
  waitlist,
  onUpdate,
  isPending,
}: SettingsSectionProps) {
  const [name, setName] = useState(waitlist.name);
  const [slug, setSlug] = useState(waitlist.slug);

  const signupUrl = `/api/w/${slug}/signup`;
  const confirmUrl = `/api/w/${slug}/confirm`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success("URL copied to clipboard");
  };

  const handleSave = () => {
    onUpdate({ name, slug }, "Settings saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          Basic waitlist information and API endpoints
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Waitlist Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            placeholder="My Waitlist"
          />
          <p className="text-xs text-muted-foreground">
            This name is shown in emails and the admin dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="slug">URL Slug</Label>
            <InfoTooltip>
              The slug is used in your API endpoints. Changing it will break
              existing integrations.
            </InfoTooltip>
          </div>
          <Input
            id="slug"
            value={slug}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSlug(e.target.value)
            }
            placeholder="my-waitlist"
            className="font-mono"
          />
        </div>

        {/* API Endpoints */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">API Endpoints</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
                <code className="text-xs font-mono truncate">{signupUrl}</code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  POST
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyUrl(signupUrl)}
                >
                  <HugeiconsIcon icon={Copy01Icon} size={12} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
                <code className="text-xs font-mono truncate">{confirmUrl}</code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  GET
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyUrl(confirmUrl)}
                >
                  <HugeiconsIcon icon={Copy01Icon} size={12} />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use these endpoints to integrate the waitlist into your website or
            app.
          </p>
        </div>

        <Button onClick={handleSave} loading={isPending}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function BrandingSettings({
  waitlist,
  onUpdate,
  isPending,
}: SettingsSectionProps) {
  const [logoUrl, setLogoUrl] = useState(waitlist.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(
    waitlist.primaryColor || "#6366f1"
  );

  const handleSave = () => {
    onUpdate(
      { logoUrl: logoUrl || undefined, primaryColor },
      "Branding saved"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize how your waitlist looks in emails and the confirmation page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <InfoTooltip>
              Your logo will appear in confirmation emails. Use a square image
              (at least 200x200px) for best results.
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
          />
          {logoUrl && (
            <div className="mt-2 rounded-md border border-border p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Brand Color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrimaryColor(e.target.value)
              }
              className="h-10 w-16 cursor-pointer p-1"
            />
            <Input
              value={primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrimaryColor(e.target.value)
              }
              placeholder="#6366f1"
              className="flex-1 font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for buttons and accents in emails and the dashboard.
          </p>
        </div>
        <Button onClick={handleSave} loading={isPending}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function BehaviorSettings({
  waitlist,
  onUpdate,
  isPending,
  transactionalEmailEnabled,
}: SettingsSectionProps & { transactionalEmailEnabled: boolean }) {
  const [doubleOptIn, setDoubleOptIn] = useState(waitlist.doubleOptIn ?? true);
  const [redirectUrl, setRedirectUrl] = useState(waitlist.redirectUrl || "");

  const handleSave = () => {
    onUpdate(
      { doubleOptIn, redirectUrl: redirectUrl || undefined },
      "Settings saved"
    );
  };

  const showEmailWarning = doubleOptIn && !transactionalEmailEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signup Behavior</CardTitle>
        <CardDescription>
          Configure how users sign up and what happens after confirmation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${showEmailWarning ? "border-warning/50 bg-warning/5" : "border-border"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="doubleOptIn" className="font-medium">
                Double opt-in
              </Label>
              <InfoTooltip>
                Recommended for GDPR compliance and to ensure email
                deliverability.
              </InfoTooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Require users to confirm their email address before being added to
              the waitlist.
            </p>
            {showEmailWarning && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-warning/10 text-warning text-sm">
                <HugeiconsIcon icon={Alert02Icon} size={16} className="shrink-0 mt-0.5" />
                <span>
                  Transactional email is not configured. Signups will be confirmed immediately without email verification.
                  Set <code className="bg-warning/20 px-1 rounded text-xs">RESEND_API_KEY</code> and <code className="bg-warning/20 px-1 rounded text-xs">RESEND_FROM_EMAIL</code> to enable.
                </span>
              </div>
            )}
          </div>
          <Switch
            id="doubleOptIn"
            checked={doubleOptIn}
            onCheckedChange={setDoubleOptIn}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="redirectUrl">Redirect URL</Label>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <Input
            id="redirectUrl"
            type="url"
            value={redirectUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRedirectUrl(e.target.value)
            }
            placeholder="https://example.com/thank-you"
          />
          <p className="text-xs text-muted-foreground">
            Returned in the signup API response. Your frontend can redirect users to this URL, or use the default confirmation page.
          </p>
        </div>
        <Button onClick={handleSave} loading={isPending}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomFieldsSettings({
  waitlist,
  onUpdate,
  isPending,
}: SettingsSectionProps) {
  const [fields, setFields] = useState<CustomField[]>(
    waitlist.customFields || []
  );

  const addField = () => {
    setFields([
      ...fields,
      {
        key: `field_${Date.now()}`,
        label: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<CustomField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Auto-generate keys from labels if empty
    const processedFields = fields.map((f) => ({
      ...f,
      key: f.key || f.label.toLowerCase().replace(/\s+/g, "_"),
    }));

    onUpdate({ customFields: processedFields }, "Custom fields saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>
          Collect additional information from users when they sign up. These
          fields will be included in signup API requests and CSV exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No custom fields configured yet.
            </p>
            <Button variant="outline" size="sm" onClick={addField}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
              Add your first field
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.key}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <HugeiconsIcon
                  icon={DragDropVerticalIcon}
                  size={16}
                  className="mt-2.5 text-muted-foreground cursor-grab"
                />
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Field Label</Label>
                      <Input
                        placeholder="e.g., Company name"
                        value={field.label}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateField(index, { label: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Field Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          updateField(index, {
                            type: v as CustomField["type"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">
                            Single line text
                          </SelectItem>
                          <SelectItem value="textarea">
                            Multi-line text
                          </SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`required-${index}`}
                        checked={field.required}
                        onCheckedChange={(v) =>
                          updateField(index, { required: v })
                        }
                      />
                      <Label htmlFor={`required-${index}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeField(index)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {fields.length > 0 && (
            <Button variant="outline" onClick={addField}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
              Add field
            </Button>
          )}
          {fields.length > 0 && (
            <Button onClick={handleSave} loading={isPending}>
              Save changes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettings({
  waitlist,
  onUpdate,
  isPending,
}: SettingsSectionProps) {
  const [notifyOnSignup, setNotifyOnSignup] = useState(
    waitlist.notifyOnSignup ?? true
  );
  const [notifyEmail, setNotifyEmail] = useState(waitlist.notifyEmail || "");
  const [webhookUrl, setWebhookUrl] = useState(waitlist.webhookUrl || "");

  const handleSave = () => {
    onUpdate(
      {
        notifyOnSignup,
        notifyEmail: notifyEmail || undefined,
        webhookUrl: webhookUrl || undefined,
      },
      "Notification settings saved"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Get notified when someone joins your waitlist. Connect to Slack,
          Discord, or any webhook-compatible service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div className="space-y-1">
            <Label className="font-medium">Email notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive an email notification for each new signup.
            </p>
          </div>
          <Switch
            checked={notifyOnSignup}
            onCheckedChange={setNotifyOnSignup}
          />
        </div>
        {notifyOnSignup && (
          <div className="space-y-2">
            <Label htmlFor="notifyEmail">Notification email</Label>
            <Input
              id="notifyEmail"
              type="email"
              value={notifyEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNotifyEmail(e.target.value)
              }
              placeholder="admin@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the Cloudflare Access authenticated email.
            </p>
          </div>
        )}
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <Input
            id="webhookUrl"
            type="url"
            value={webhookUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWebhookUrl(e.target.value)
            }
            placeholder="https://hooks.slack.com/services/..."
          />
          <p className="text-xs text-muted-foreground">
            A POST request with signup data will be sent to this URL. Works with
            Slack, Discord, Zapier, and other services.
          </p>
        </div>
        <Button onClick={handleSave} loading={isPending}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function SecuritySettings({
  waitlist,
  onUpdate,
  isPending,
}: SettingsSectionProps) {
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
    onUpdate({ allowedOrigins: origins }, "Security settings saved");
  };

  const hasChanges = JSON.stringify(origins) !== JSON.stringify(waitlist.allowedOrigins || []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Allowed Origins (CORS)
          <InfoTooltip>
            Restrict which websites can submit to this waitlist. Leave empty to allow all origins. Supports wildcards like <code>*.example.com</code>.
          </InfoTooltip>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrigin(e.target.value)}
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
            Save changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { WaitlistSettingsPage as default };
