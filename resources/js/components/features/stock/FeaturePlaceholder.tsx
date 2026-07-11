import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: AppIconName;
  items: string[];
}

export function FeaturePlaceholder({ title, description, icon, items }: FeaturePlaceholderProps) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <AppIcon name={icon} className="size-7" />
          </span>
          <div>
            <h1 className="font-bold text-2xl text-foreground">{title}</h1>
            <p className="mt-1 text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-base text-card-foreground">Phase 3 以降で実装する内容</h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
