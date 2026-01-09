import { createContext, useContext, type ReactNode } from "react";
import { useConfig } from "@/lib/queries";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============ Context ============

interface DemoModeContextValue {
  isDemoMode: boolean;
  isLoading: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  isLoading: true,
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useConfig();
  const isDemoMode = data?.demoMode ?? false;

  return (
    <DemoModeContext.Provider value={{ isDemoMode, isLoading }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

// ============ Demo Mode Banner ============

export function DemoModeBanner() {
  const { isDemoMode, isLoading } = useDemoMode();

  if (isLoading || !isDemoMode) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-primary shrink-0" />
          <span className="text-primary font-medium">Demo Mode</span>
          <span className="text-muted-foreground">
            — This is a read-only demo.{" "}
            <a
              href="https://github.com/d4mr/0list"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Deploy your own
            </a>{" "}
            to make changes.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============ Demo Mode Button Wrapper ============

interface DemoModeButtonProps extends ButtonProps {
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

/**
 * Button that's disabled in demo mode with a tooltip explaining why.
 * Use this for any button that performs a write operation.
 */
export function DemoModeButton({
  children,
  disabled,
  tooltipSide = "top",
  className,
  ...props
}: DemoModeButtonProps) {
  const { isDemoMode } = useDemoMode();
  const isDisabled = isDemoMode || disabled;

  const button = (
    <Button
      {...props}
      disabled={isDisabled}
      className={cn(isDemoMode && "cursor-not-allowed", className)}
    >
      {children}
    </Button>
  );

  if (isDemoMode) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Disabled in demo mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

// ============ Demo Mode Wrapper for custom elements ============

interface DemoModeWrapperProps {
  children: ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}

/**
 * Wrapper that shows a tooltip in demo mode for any interactive element.
 */
export function DemoModeWrapper({
  children,
  tooltipSide = "top",
  disabled,
}: DemoModeWrapperProps) {
  const { isDemoMode } = useDemoMode();

  if (isDemoMode || disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-not-allowed">{children}</span>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Disabled in demo mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <>{children}</>;
}
