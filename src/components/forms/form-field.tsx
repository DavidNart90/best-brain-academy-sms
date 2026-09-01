import { Label } from "@/components/ui/label";

export function FormField({
  id,
  label,
  required,
  description,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`} data-invalid={Boolean(error)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
