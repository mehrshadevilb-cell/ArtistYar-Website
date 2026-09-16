"use client";

const rows = [
  { name: "سارا م.", phone: "09••••••12", active: true, courses: 2 },
  { name: "علی ک.", phone: "09••••••44", active: true, courses: 1 },
  { name: "نیما ر.", phone: "09••••••08", active: false, courses: 1 },
];

export default function AdminStudentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">هنرجویان</h2>
      <div className="card-ay overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/[0.06] text-xs text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">موبایل</th>
              <th className="px-4 py-3 font-medium">دوره</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-sand-100">{r.name}</td>
                <td className="px-4 py-3 text-ink-300">{r.phone}</td>
                <td className="px-4 py-3 text-ink-300">{r.courses}</td>
                <td className="px-4 py-3 text-ink-400">{r.active ? "فعال" : "غیرفعال"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
