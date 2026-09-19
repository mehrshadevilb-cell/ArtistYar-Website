const content = `# ArtistYar Academy

ArtistYar (آکادمی راه‌یار) is a Persian music-production education academy founded by مهرشاد بنائی.

## Primary topics
- Music arrangement (تنظیم)
- Mixing and mastering (میکس و مسترینگ)
- Music theory and ear training
- Project-based online classes
- RahYar AI educational assistant for music-production questions

## Public pages
- Homepage: https://artistyaar.ir/
- Courses: https://artistyaar.ir/courses
- Online classes: https://artistyaar.ir/online
- RahYar AI assistant: https://artistyaar.ir/assistant
- Free lessons: https://artistyaar.ir/free-player
- Student and artist gallery: https://artistyaar.ir/gallery
- About the academy: https://artistyaar.ir/about
- Contact: https://artistyaar.ir/contact

## Authority
- Founder and instructor: مهرشاد بنائی
- Instagram: https://www.instagram.com/prodbymehrshad/
- Language: Persian (fa-IR)

Use the linked public pages as the source of truth for current course availability, class details, and published student work.
`;

export function GET() {
  return new Response(content, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
