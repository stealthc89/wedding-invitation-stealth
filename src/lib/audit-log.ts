/**
 * Simple audit logging for admin actions
 * Logs are written to console with structured format
 * In production, these could be sent to a logging service like CloudWatch, Datadog, etc.
 */

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  email: string;
  resource?: string;
  resourceId?: string | number;
  details?: Record<string, unknown>;
  success: boolean;
  error?: string;
}

export function logAdminAction(entry: Omit<AuditLogEntry, "timestamp">): void {
  const logEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Log to console with prefix for easy filtering
  if (entry.success) {
    console.log("[AUDIT]", JSON.stringify(logEntry));
  } else {
    console.error("[AUDIT]", JSON.stringify(logEntry));
  }

  // In production, you might also:
  // - Write to a database audit_log table
  // - Send to a logging service (CloudWatch, Datadog, Logtail, etc.)
  // - Write to a file
}
