export default function ProjectCardFrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-white">{children}</div>
  );
}
