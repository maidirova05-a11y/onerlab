import { ArrowRightIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { MaskedLogo } from '@/components/ui/MaskedLogo';
import { hero, intro } from '@/content/site';

/**
 * =============================================================================
 * The opening screen.
 * =============================================================================
 * Full-viewport footage with the studio name cut out of it, in the manner of
 * tassay.kz. The brand name is painted on with a brush sweep rather than faded
 * in — the reveal is doing double duty as the first demonstration of what the
 * school actually teaches.
 *
 * The aperture is the real wordmark, masked by its own alpha channel, rather
 * than rendered text — so the letterforms are the brand's, ornament and all.
 *
 * SEMANTICS: the name renders as role="img", not a heading. The page's real <h1>
 * ("Раскройте творческий потенциал…") stays in the section below, where it can
 * carry the keywords a parent actually searches for. A giant "OnerLab" <h1>
 * would look impressive and rank for nothing.
 *
 * The same source feeds the background and the letterforms. The background is
 * dimmed and the letters are not, so the type reads as a window cut through to
 * a brighter version of the same scene — which is what makes the effect legible
 * rather than muddy.
 * =============================================================================
 */
export function Intro() {
  const useVideo = intro.videoSrc.length > 0;

  return (
    <section
      // Height comes from `.intro-screen` (--intro-h) so the masked logo's
      // footage can be pinned to exactly the same rectangle. svh, not vh: on
      // mobile the browser chrome makes vh taller than the visible area.
      className="intro-screen relative flex flex-col items-center justify-center overflow-hidden bg-ink"
      aria-label={`${intro.brand} — ${intro.tagline}`}
    >
      {/* The backdrop: one video for the whole screen. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {useVideo ? (
          <video
            data-intro-backdrop
            className="h-full w-full object-cover"
            src={intro.videoSrc}
            // Same frame as the letters' poster, so a phone that is still
            // buffering (or refuses autoplay) shows the studio, not a grey box.
            poster={intro.logoStillSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          // An SVG has no intrinsic raster size for next/image to optimise; it ships as-is.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={intro.fallbackSrc} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* --- Scrim + mark --- */}
      <div className="absolute inset-0 isolate">
        {/*
          Two overlays, not one. The flat scrim sets the contrast floor for the
          type; the vertical gradient darkens the bottom so the CTA and the
          scroll cue stay readable over whatever the footage is doing there.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/68" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/85" />

        {/* --- Foreground --- */}
        <div className="relative flex h-full w-full flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="flex w-full max-w-6xl flex-col items-center">
            <MaskedLogo
              logoSrc="/hero/logo-mask.png"
              badgeSrc="/hero/logo-lab-badge.png"
              label={intro.brand}
              mediaType={useVideo ? 'video' : 'image'}
              src={useVideo ? intro.videoSrc : intro.fallbackSrc}
              // A frame from the same footage: the poster while the video
              // loads, and the fill if it cannot play (Data Saver, errors).
              // Phones get the live video too — a frozen frame inside the
              // letters over a moving backdrop read as a video that never
              // loaded. Both elements share one URL, so the file is fetched
              // once and served to the second from cache.
              fallbackSrc={intro.logoStillSrc}
              syncWith="[data-intro-backdrop]"
              brightness={1.35}
              saturation={1.25}
              duration={2.1}
              className="w-full max-w-[340px] sm:max-w-[520px] lg:max-w-[760px]"
            />

            <p className="intro-rise intro-rise--1 mt-6 text-lg font-bold text-white sm:text-xl lg:text-2xl">{intro.tagline}</p>
            <p className="intro-rise intro-rise--2 mt-3 max-w-xl text-sm text-white/70 sm:text-base">{intro.subline}</p>

            <div className="intro-rise intro-rise--3 mt-9">
              <Button href="#signup" size="lg">
                {hero.primaryCta}
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Scroll cue --- */}
      <a
        href="#about"
        className="intro-rise intro-rise--4 absolute inset-x-0 bottom-7 z-10 mx-auto flex w-fit flex-col items-center gap-2 text-xs font-semibold tracking-wide text-white/60 uppercase transition-colors hover:text-white"
      >
        {intro.scrollCue}
        <span aria-hidden className="block h-9 w-[1.5px] animate-pulse bg-white/40" />
      </a>
    </section>
  );
}
