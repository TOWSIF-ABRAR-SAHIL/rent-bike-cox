/** Static homepage content (Image-2 sections). News cards link to real pages —
 * there is no blog backend, so every card must land somewhere that exists.
 * Testimonials live inline in Home.tsx; packages come from /dashboard/settings. */

export interface NewsItem {
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: string;
  href: string;
}

const img = (id: string): string =>
  `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;

export const NEWS: NewsItem[] = [
  {
    title: 'Marine Drive on Two Wheels: The Ultimate Guide',
    excerpt: '80km of ocean road from Kolatoli to Teknaf — where to stop, fuel up, and catch sunset.',
    image: img('photo-1507525428034-b723cf961d3e'),
    date: 'Sep 2026',
    readTime: '5 min read',
    href: '/search?zone=Marine Drive',
  },
  {
    title: 'How Day Packages Save You Money',
    excerpt: 'Hourly vs 1-day vs weekly: which package fits a weekend trip to Himchari and Inani.',
    image: img('photo-1558981403-c5f9899a28bc'),
    date: 'Sep 2026',
    readTime: '3 min read',
    href: '/search',
  },
  {
    title: 'What To Check Before You Ride Out',
    excerpt: 'Brakes, lights, fuel, documents — the 2-minute inspection our renters swear by.',
    image: img('photo-1519046904884-53103b34b206'),
    date: 'Sep 2026',
    readTime: '4 min read',
    href: '/policies',
  },
];
