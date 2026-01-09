import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  MoreHorizontalIcon,
  Delete02Icon,
  Settings02Icon,
  UserGroupIcon,
  ArrowUpRight01Icon,
  LayersIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useWaitlists,
  useCreateWaitlist,
  useDeleteWaitlist,
} from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";

export function WaitlistsPage() {
  const { data, isLoading } = useWaitlists();
  const showLoading = useDelayedLoading(isLoading);
  const waitlists = data?.waitlists || [];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-base font-medium">Waitlists</h1>
        <CreateWaitlistDialog />
      </header>

      <div className="flex-1 p-6">
        {showLoading && !data ? (
          <LoadingState />
        ) : !isLoading && waitlists.length === 0 ? (
          <EmptyState />
        ) : waitlists.length > 0 ? (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_120px_120px_100px_40px] gap-4 px-4 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Waitlist</div>
              <div className="text-right">Signups</div>
              <div className="text-right">Confirmed</div>
              <div className="text-right">Rate</div>
              <div></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {waitlists.map((waitlist, index) => (
                <WaitlistRow
                  key={waitlist.id}
                  waitlist={waitlist}
                  style={{ animationDelay: `${index * 30}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WaitlistRow({
  waitlist,
  style,
}: {
  waitlist: {
    id: string;
    name: string;
    slug: string;
    signupCount: number;
    confirmedCount: number;
    primaryColor: string | null;
    createdAt: string;
  };
  style?: React.CSSProperties;
}) {
  const deleteWaitlist = useDeleteWaitlist();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const conversionRate = waitlist.signupCount > 0
    ? Math.round((waitlist.confirmedCount / waitlist.signupCount) * 100)
    : 0;

  const handleDelete = () => {
    deleteWaitlist.mutate(waitlist.id, {
      onSuccess: () => {
        toast.success("Waitlist deleted");
        setDeleteOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <>
      <Link
        to={`/admin/waitlists/${waitlist.id}/signups`}
        className="group grid grid-cols-[1fr_120px_120px_100px_40px] gap-4 px-4 py-4 items-center transition-colors hover:bg-muted/40 animate-in fade-in slide-in-from-bottom-1 duration-300"
        style={style}
      >
        {/* Name & Slug */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-2 h-8 rounded-full shrink-0 transition-all duration-200 group-hover:h-10"
            style={{ backgroundColor: waitlist.primaryColor || "hsl(var(--primary))" }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {waitlist.name}
              </span>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 shrink-0"
              />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs text-muted-foreground font-mono">/{waitlist.slug}</code>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground/60">{formatRelativeTime(waitlist.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Signups */}
        <div className="text-right">
          <p className="text-sm font-semibold font-mono tabular-nums">
            {formatNumber(waitlist.signupCount)}
          </p>
        </div>

        {/* Confirmed */}
        <div className="text-right">
          <p className="text-sm font-mono tabular-nums text-muted-foreground">
            {formatNumber(waitlist.confirmedCount)}
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5">
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${conversionRate}%` }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground w-8">
              {conversionRate}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/admin/waitlists/${waitlist.id}/signups`}>
                  <HugeiconsIcon icon={UserGroupIcon} size={16} className="mr-2" />
                  View signups
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/waitlists/${waitlist.id}/settings`}>
                  <HugeiconsIcon icon={Settings02Icon} size={16} className="mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Link>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete waitlist?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{waitlist.name}" and all its
              signups. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteWaitlist.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingState() {
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_120px_100px_40px] gap-4 px-4 py-3 border-b border-border bg-muted/30">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12 ml-auto" />
        <Skeleton className="h-4 w-14 ml-auto" />
        <Skeleton className="h-4 w-8 ml-auto" />
        <div />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_120px_100px_40px] gap-4 px-4 py-4 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="w-2 h-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-10 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
            <div />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <HugeiconsIcon icon={LayersIcon} size={28} className="text-primary/70" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">No waitlists yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
        Create your first waitlist to start collecting signups from your users.
      </p>
      <CreateWaitlistDialog />
    </div>
  );
}

function CreateWaitlistDialog() {
  const createWaitlist = useCreateWaitlist();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createWaitlist.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success("Waitlist created");
          setOpen(false);
          setName("");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-1.5" />
          New Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create waitlist</DialogTitle>
            <DialogDescription>
              Create a new waitlist to start collecting signups.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Product Waitlist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                A URL-friendly slug will be auto-generated from the name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createWaitlist.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { WaitlistsPage as default };
