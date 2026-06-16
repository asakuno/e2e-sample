interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: string;
  items: string[];
}

export function FeaturePlaceholder({ title, description, icon, items }: FeaturePlaceholderProps) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-[28px] text-blue-700"
            aria-hidden="true"
          >
            {icon}
          </span>
          <div>
            <h1 className="font-bold text-2xl text-gray-900">{title}</h1>
            <p className="mt-1 text-gray-600 text-sm">{description}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-base text-gray-900">Phase 3 以降で実装する内容</h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
