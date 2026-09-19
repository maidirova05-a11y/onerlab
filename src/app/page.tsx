import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { JsonLd } from '@/components/seo/JsonLd';
import { About } from '@/components/sections/About';
import { Advantages } from '@/components/sections/Advantages';
import { Faq } from '@/components/sections/Faq';
import { Gallery } from '@/components/sections/Gallery';
import { Hero } from '@/components/sections/Hero';
import { Intro } from '@/components/sections/Intro';
import { Program } from '@/components/sections/Program';
import { Signup } from '@/components/sections/Signup';
import { homeGraph } from '@/lib/seo/structured-data';

/**
 * Landing page composition.
 *
 * The order follows the parent's decision path rather than the org chart:
 * promise (Hero) -> who we are (About) -> why us (Advantages) -> what exactly
 * and how much (Program) -> proof (Gallery) -> act (Signup) -> reach us (Footer).
 *
 * Everything here is a Server Component except `Header` and the form itself,
 * so almost no JavaScript ships for the content sections.
 */
export default function HomePage() {
  return (
    <>
      <Header />

      <main id="main">
        <Intro />
        <Hero />
        <About />
        <Advantages />
        <Program />
        <Gallery />
        <Faq />
        <Signup />
      </main>

      <Footer />

      {/*
        Page-level structured data: this URL, its breadcrumb, the FAQ and the
        student-work gallery. Kept here rather than in the root layout so that
        the FAQ markup only ever ships on the page that actually renders the
        questions — Google discards (and can penalise) FAQ data a visitor
        cannot see.
      */}
      <JsonLd data={homeGraph()} />
    </>
  );
}
