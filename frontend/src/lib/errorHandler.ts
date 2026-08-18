import { ApiError, getErrorMessage, isCreditsError } from "./api";

interface ErrorHandlerOptions {
  toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  navigate: (path: string) => void;
  /** Called when 402 error is detected — show CreditAlert */
  onCreditsError?: (message: string) => void;
}

/**
 * Centralized error handler for API errors.
 * Routes errors to the correct UI feedback based on status code.
 */
export function handleApiError(err: unknown, options: ErrorHandlerOptions): void {
  const { toast, navigate, onCreditsError } = options;

  if (!(err instanceof ApiError)) {
    toast({
      title: "Error",
      description: getErrorMessage(err),
      variant: "destructive",
    });
    return;
  }

  // 401 — redirect to login
  if (err.isUnauthorized) {
    toast({
      title: "Session expired",
      description: err.detail,
    });
    navigate("/auth");
    return;
  }

  // 402 — out of credits
  if (err.isPaymentRequired) {
    if (onCreditsError) {
      onCreditsError(err.detail);
    } else {
      toast({
        title: "Credits required",
        description: err.detail,
        variant: "destructive",
      });
    }
    return;
  }

  // 404 — not found
  if (err.isNotFound) {
    toast({
      title: "Not found",
      description: err.detail,
      variant: "destructive",
    });
    return;
  }

  // 400 / other — show the backend message
  toast({
    title: "Error",
    description: err.detail,
    variant: "destructive",
  });
}
