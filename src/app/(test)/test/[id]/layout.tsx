export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="test-layout">
      {/* Main Content (Passage + Questions) */}
      <main className="test-content">
        {children}
      </main>
    </div>
  );
}
