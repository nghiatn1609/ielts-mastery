import RequireAuth from "@/components/auth/RequireAuth";

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth title="Đăng nhập để làm bài" message="Bạn cần đăng nhập để làm bài thi và lưu điểm số.">
      {children}
    </RequireAuth>
  );
}
