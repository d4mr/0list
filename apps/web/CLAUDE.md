# Claude Code Conventions

This document defines the coding conventions and patterns for this codebase. Follow these rules strictly.

## Loading States (CRITICAL)

**Never show loading skeletons immediately.** Use the `useDelayedLoading` hook to prevent flash of loading state for fast requests.

```tsx
import { useDelayedLoading } from "@/lib/hooks";

function MyComponent() {
  const { data, isLoading } = useQuery(...);
  const showLoading = useDelayedLoading(isLoading); // 150ms delay

  // Show skeleton ONLY after delay AND no data
  if (showLoading && !data) {
    return <Skeleton />;
  }

  // Show empty state ONLY when NOT loading AND no data
  if (!isLoading && isEmpty) {
    return <EmptyState />;
  }

  // Still loading but before delay - show nothing (no flash)
  if (!data) {
    return null;
  }

  return <Content data={data} />;
}
```

**Rules:**
- Never show empty states while loading
- Skeletons use `bg-muted` (not `bg-primary/10`)
- Auth spinners use subtle colors: `border-muted-foreground/20 border-t-muted-foreground/60`
- Page layouts should render immediately; only data sections show loading states

**Available utilities:**
- `useDelayedLoading(isLoading, delay?)` - Returns true only after delay (default 150ms)
- `<ContentLoader>` component - Handles loading/empty/content states correctly

---

## Component Patterns

### Structure
```tsx
interface MyComponentProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function MyComponent({ value, onChange, className }: MyComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {/* content */}
    </div>
  );
}
```

### UI Primitives (forwardRef pattern)
```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";
```

### Exports
- Named exports for components: `export function MyComponent`
- Default export at bottom for pages: `export { MyPage as default }`

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| UI components | kebab-case | `date-range-picker.tsx` |
| Page components | kebab-case file, PascalCase function | `signups.tsx` → `WaitlistSignupsPage` |
| Hooks/utilities | lowercase | `hooks.ts`, `utils.ts` |
| Route folders | kebab-case with params | `[id]/settings.tsx` |

---

## Import Order

Always order imports as follows:

```tsx
// 1. React
import { useState, useEffect } from "react";

// 2. External libraries
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

// 3. Icons
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Settings02Icon } from "@hugeicons/core-free-icons";

// 4. UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// 5. Feature components
import { MetricCard } from "@/components/stats";

// 6. Queries/hooks
import { useWaitlist, useUpdateWaitlist } from "@/lib/queries";
import { useDelayedLoading } from "@/lib/hooks";

// 7. Utilities
import { cn, formatNumber } from "@/lib/utils";
```

---

## Styling

### Class Merging
Always use `cn()` for className composition:
```tsx
className={cn(
  "base-classes here",
  conditional && "conditional-classes",
  className // prop always last
)}
```

### Color Tokens
Use semantic color tokens, not raw colors:
- `bg-background`, `bg-card`, `bg-muted`
- `text-foreground`, `text-muted-foreground`
- `border-border`
- `text-primary`, `bg-primary/10`
- Status: `text-success`, `text-warning`, `text-destructive`

### Responsive
Mobile-first with breakpoint prefixes:
```tsx
className="text-sm sm:text-base lg:text-lg"
className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
className="hidden sm:block" // hide on mobile
```

---

## Icons

Use Hugeicons with consistent sizing:
```tsx
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";

// In buttons
<HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />

// Standalone
<HugeiconsIcon icon={InfoIcon} size={14} className="text-muted-foreground" />

// Always use shrink-0 in flex containers
<HugeiconsIcon icon={Icon} size={16} className="shrink-0" />
```

---

## Data Fetching

### Query Keys Factory
```tsx
export const queryKeys = {
  items: ["items"] as const,
  item: (id: string) => ["items", id] as const,
  itemsByFilter: (filter: Filter) => ["items", "list", filter] as const,
};
```

### Query Hook Pattern
```tsx
export function useItem(id: string) {
  return useQuery({
    queryKey: queryKeys.item(id),
    queryFn: async () => {
      const res = await api.items[":id"].$get({ param: { id } });
      return handleResponse<{ item: Item }>(res);
    },
    enabled: !!id,
  });
}
```

### Mutation Hook Pattern
```tsx
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Item> }) => {
      const res = await api.items[":id"].$patch({ param: { id }, json: data });
      return handleResponse<{ item: Item }>(res);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.item(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}
```

---

## Form Handling

### Controlled Components with useState
```tsx
function MyForm({ initialValue, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const mutation = useUpdateItem();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { value },
      {
        onSuccess: () => toast.success("Saved"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button type="submit" loading={mutation.isPending}>
        Save
      </Button>
    </form>
  );
}
```

---

## Toast Notifications

Use `sonner` for all notifications:
```tsx
import { toast } from "sonner";

// Success
toast.success("Item created");

// Error (use error.message from ApiError)
toast.error(error.message);

// With mutation callbacks
mutation.mutate(data, {
  onSuccess: () => toast.success("Saved"),
  onError: (error) => {
    const message = error instanceof ApiError ? error.message : "Failed to save";
    toast.error(message);
  },
});
```

---

## Error Handling

### API Errors
```tsx
import { ApiError } from "@/lib/queries";

// In mutation callbacks
onError: (error: Error) => {
  const message = error instanceof ApiError ? error.message : "An error occurred";
  toast.error(message);
}
```

### Component Guards
```tsx
// Order matters: loading → error → empty → content
if (showLoading && !data) return <Skeleton />;
if (!isLoading && !data) return <NotFound />;
if (!data) return null;

return <Content data={data} />;
```

---

## Type Patterns

### Props Interfaces
```tsx
interface Props {
  item: Item;
  onUpdate: (data: Partial<Item>) => void;
  isPending: boolean;
  className?: string;
}
```

### Query Key Types
```tsx
export const queryKeys = {
  items: ["items"] as const,
} as const;
```

### Extending HTML Element Props
```tsx
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}
```

---

## Animation

Use Tailwind animation utilities:
```tsx
// Fade in with slide
className="animate-in fade-in slide-in-from-bottom-1 duration-300"

// Staggered animation
style={{ animationDelay: `${index * 30}ms` }}

// Spinner
className="animate-spin"

// Pulse for skeletons
className="animate-pulse"
```

---

## Project Structure

```
web/src/
├── components/
│   ├── ui/           # Reusable UI primitives (shadcn pattern)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   └── content-loader.tsx
│   ├── stats/        # Domain-specific components
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts        # Hono RPC client setup
│   ├── queries.ts    # React Query hooks & types
│   ├── hooks.ts      # Custom React hooks
│   └── utils.ts      # Utility functions (cn, formatters)
├── routes/
│   └── admin/
│       ├── layout.tsx
│       ├── dashboard.tsx
│       └── waitlists/
│           └── [id]/
│               ├── layout.tsx
│               ├── signups.tsx
│               └── settings.tsx
└── App.tsx
```

---

## Do NOT

- Show skeletons immediately (use `useDelayedLoading`)
- Show empty states while loading
- Use `border-primary` for spinners (too prominent)
- Use raw Tailwind colors (`bg-blue-500`) - use tokens
- Forget `shrink-0` on icons in flex containers
- Use `any` type - always type properly
- Forget to invalidate queries after mutations
- Mix controlled/uncontrolled form patterns
