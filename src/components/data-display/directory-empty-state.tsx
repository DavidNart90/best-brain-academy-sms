import type { LucideIcon } from "lucide-react";

export function DirectoryEmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: Array<{
    label: string;
    description: string;
    icon: LucideIcon;
    content: React.ReactNode;
  }>;
}) {
  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="empty-directory-title"
    >
      <div className="border-b bg-muted/25 px-6 py-5">
        <h2 id="empty-directory-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <ol className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
        {actions.map(
          (
            { label, description: actionDescription, icon: Icon, content },
            index,
          ) => (
            <li key={label} className="flex min-h-48 flex-col items-start p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {index + 1}
                </span>
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-semibold">{label}</h3>
              <p className="mt-1 mb-5 text-sm leading-6 text-muted-foreground">
                {actionDescription}
              </p>
              <div className="mt-auto">{content}</div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
