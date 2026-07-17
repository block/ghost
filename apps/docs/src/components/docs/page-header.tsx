interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
}

export function PageHeader({ kicker, title, description }: PageHeaderProps) {
  return (
    <header className="doc-masthead">
      <h1 className="doc-masthead-title">{title}</h1>
      <p className="doc-masthead-kicker">{kicker}</p>
      {description ? (
        <p className="doc-masthead-description">{description}</p>
      ) : null}
    </header>
  );
}
