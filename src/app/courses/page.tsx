import type { Metadata } from "next";
import { CourseCard } from "@/components/CourseCard";
import { SectionHeading } from "@/components/SectionHeading";
import { courses } from "@/data/courses";

export const metadata: Metadata = {
  title: "دوره‌ها",
};

export default function CoursesPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="Courses"
        title="مسیرهای آموزشی آرتیست‌یار"
        subtitle="دوره‌های دیجیتال و کلاس‌های آنلاین در یک نگاه. جزئیات مالی و ثبت‌نام در اتصال بعدی به backend فعال می‌شود."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} id={course.id}>
            <CourseCard course={course} />
          </div>
        ))}
      </div>
    </section>
  );
}
