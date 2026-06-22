import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect, type FormEvent } from 'react';
import { Ban, Gauge, HelpCircle, History, Info, ListChecks, Loader2, ShieldCheck } from 'lucide-react';
import { LocaleSelector } from '@/components/locale-selector';
import { envConfigs } from '@/config';
import { saveCard, type Scene, type CalmCard } from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';
import { isUnsupportedTradingInput } from '@/lib/trading/input-guard';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl, setLocale } from '@/paraglide/runtime.js';

const DRAFT_KEY = 'calm_card_home_draft';
const LOCALE_HINT_DISMISS_KEY = 'before_you_trade_locale_hint_dismissed';

const SCENE_CHIPS: { value: Scene; labelKey: keyof typeof m }[] = [
  { value: 'buy', labelKey: 'home.scene.buy' },
  { value: 'add', labelKey: 'home.scene.add' },
  { value: 'take_profit', labelKey: 'home.scene.take_profit' },
  { value: 'cut', labelKey: 'home.scene.cut' },
  { value: 'missed', labelKey: 'home.scene.missed' },
  { value: 'chase_loss', labelKey: 'home.scene.chase_loss' },
  { value: 'unclear', labelKey: 'home.scene.unclear' },
];

const CHECK_ITEMS = [
  { icon: ShieldCheck, titleKey: 'home.check.emotion.title', textKey: 'home.check.emotion.text' },
  { icon: ListChecks, titleKey: 'home.check.reason.title', textKey: 'home.check.reason.text' },
  { icon: Gauge, titleKey: 'home.check.position.title', textKey: 'home.check.position.text' },
] as const;

const SCENARIO_KEYS = [
  'home.scenario.hold_gain',
  'home.scenario.buy_back',
  'home.scenario.add_loss',
  'home.scenario.chase',
  'home.scenario.add_unclear',
  'home.scenario.restless',
] as const;

const STEP_KEYS = [
  'home.step.write',
  'home.step.calm',
  'home.step.position',
  'home.step.history',
] as const;

const FAQ_KEYS = ['advice', 'write', 'position', 'storage'] as const;
const STEP_COUNT = STEP_KEYS.length;

// Minimal local pre-check: only block obviously-empty input — no model call.
// "Real content" = at least a short genuine sentence, OR a scene chip picked.
function hasRealContent(thoughts: string, scene: Scene | null): boolean {
  const t = thoughts.trim();
  if (scene && t.length >= 2) return true; // chip + a couple chars is enough
  return t.length >= 6; // otherwise need a short real sentence
}

function HomePage() {
  const navigate = useNavigate();
  const locale = getLocale();
  const currentYear = new Date().getFullYear();
  const [thoughts, setThoughts] = useState('');
  const [scene, setScene] = useState<Scene | null>(null);
  const [hint, setHint] = useState(false);
  const [showLocaleHint, setShowLocaleHint] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a draft saved before navigating away (e.g. browser back button).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.thoughts === 'string') setThoughts(d.thoughts);
        if (d.scene) setScene(d.scene);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist the draft as the user types/picks, so back navigation keeps it.
  useEffect(() => {
    if (!thoughts && !scene) {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ thoughts, scene }));
  }, [thoughts, scene]);

  useEffect(() => {
    if (locale !== 'en' || typeof navigator === 'undefined') return;

    try {
      if (localStorage.getItem(LOCALE_HINT_DISMISS_KEY) === '1') return;
      const hasExplicitLocale = document.cookie
        .split(';')
        .some((item) => item.trim().startsWith('PARAGLIDE_LOCALE='));
      if (hasExplicitLocale) return;
    } catch {
      return;
    }

    const preferredLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    const prefersChinese = preferredLanguages.some((language) =>
      language.toLowerCase().startsWith('zh')
    );
    setShowLocaleHint(prefersChinese);
  }, [locale]);

  const dismissLocaleHint = () => {
    try {
      localStorage.setItem(LOCALE_HINT_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowLocaleHint(false);
  };

  const switchToChinese = () => {
    try {
      localStorage.setItem(LOCALE_HINT_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setLocale('zh');
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!hasRealContent(thoughts, scene)) {
      setHint(true);
      return;
    }
    if (isUnsupportedTradingInput(thoughts)) {
      setHint(false);
      setError(m['home.error.unsupported']());
      return;
    }
    setHint(false);
    setIsGenerating(true);
    setError(null);

    const input = {
      type: scene ?? 'unclear',
      locale,
      symbol: '',
      thoughts: thoughts.trim(),
      emotions: [],
      plannedAmount: '',
      currentPositionRatio: '',
      maxLossTolerance: '',
      originalPlan: '',
      focusChecks: [],
      extraAnswers: {},
      createdAt: new Date().toISOString(),
    };

    try {
      const card: CalmCard = await apiPost('/api/trading/generate-report', input);
      saveCard(card);
      sessionStorage.removeItem(DRAFT_KEY); // generated successfully — clear draft
      setIsGenerating(false);
      navigate({ to: '/card/$id', params: { id: card.id } });
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof ApiError ? err.message : m['home.error.generate_failed']());
    }
  };

  return (
    <div className="brake-page min-h-screen flex flex-col text-slate-900">
      {/* Top nav */}
      <header className="brake-nav px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-3 font-semibold text-white drop-shadow-[0_1px_8px_rgba(5,54,99,0.24)]">
            <img src="/logo.svg" alt="" className="h-7 w-7 rounded-lg shadow-[0_6px_16px_rgba(5,54,99,0.22)]" />
            {m['home.product_name']()}
          </span>
          <div className="flex items-center gap-2">
            <LocaleSelector
              variant="pill"
              className="h-8 border-white/28 bg-white/10 px-3 text-xs font-medium text-white/95 hover:bg-white/15 hover:text-white"
            />
            <Link
              to="/history"
              className="rounded-full border border-white/28 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/95 shadow-[0_1px_10px_rgba(5,54,99,0.08)] hover:border-white/55 hover:bg-white/15 transition-colors"
            >
              {m['home.nav.history']()}
            </Link>
          </div>
        </div>
      </header>

      {/* First screen */}
      <main className="flex-1 px-5 pb-10 lg:pb-16">
        <div className="max-w-6xl mx-auto w-full pt-8 sm:pt-10 lg:pt-16">
          {showLocaleHint && (
            <div className="brake-card mb-5 flex flex-col gap-3 rounded-[18px] px-4 py-3 text-sm text-slate-700 shadow-[0_16px_48px_rgba(5,54,99,0.1)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{m['home.locale_hint.title']()}</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">
                  {m['home.locale_hint.text']()}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={dismissLocaleHint}
                  className="rounded-full border border-slate-200 bg-white/72 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800"
                >
                  {m['home.locale_hint.stay']()}
                </button>
                <button
                  type="button"
                  onClick={switchToChinese}
                  className="rounded-full bg-[#086aa8] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-[0_8px_20px_rgba(8,106,168,0.18)] transition-colors hover:bg-[#075b96]"
                >
                  {m['home.locale_hint.switch']()}
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 xl:gap-16 items-start">
            {/* Title */}
            <section className="max-w-xl">
              <h1 className="metal-hero-title text-[2.15rem] sm:text-[2.7rem] lg:text-[3.2rem] font-bold leading-[1.36]">
                {m['home.hero.line1']()}
                <br />
                {m['home.hero.line2']()}
              </h1>
              <p className="mt-6 text-[16px] lg:text-[16.5px] font-semibold text-white/90 leading-[1.85] max-w-xl drop-shadow-[0_1px_10px_rgba(5,54,99,0.18)]">
                {m['home.hero.subhead']()}
              </p>
            </section>

            {/* Main input */}
            <form onSubmit={handleSubmit} className="brake-workbench w-full rounded-[22px] p-4 sm:p-5 lg:p-6">
              <div className="brake-input rounded-[17px] p-5">
                <textarea
                  value={thoughts}
                  onChange={(e) => {
                    setThoughts(e.target.value);
                    if (hint) setHint(false);
                  }}
                  placeholder={m['home.input.placeholder']()}
                  rows={7}
                  disabled={isGenerating}
                  className="w-full min-h-[190px] px-0 py-0 bg-transparent border-0 focus:ring-0 outline-none resize-none text-[15px] leading-relaxed text-stone-800 placeholder:text-[#10344e]/35 disabled:opacity-60"
                />
              </div>

              <p className="mt-3 px-1 text-[13px] text-stone-500">
                {m['home.input.helper']()}
              </p>

              {hint && (
                <p className="mt-2 text-[13px] text-neutral-700">
                  {m['home.error.empty']()}
                </p>
              )}

              {/* Scene chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                {SCENE_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setScene(scene === chip.value ? null : chip.value)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors border disabled:opacity-60 ${
                      scene === chip.value
                        ? 'bg-[#0877c7] text-white border-[#0877c7] shadow-[0_0_0_2px_rgba(8,119,199,0.1)]'
                        : 'bg-white/72 text-[#075b96] border-dashed border-[#7ec5f2]/80 shadow-[0_2px_10px_rgba(8,119,199,0.04)] hover:border-solid hover:border-[#2582be]/65 hover:bg-white hover:text-[#064f84] active:scale-[0.98]'
                    }`}
                  >
                    {m[chip.labelKey]()}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && <p className="mt-5 text-[13px] text-neutral-700 px-1">{error}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={isGenerating}
                className="brake-primary mt-7 w-full py-3.5 rounded-xl text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {m['home.button.loading']()}
                  </>
                ) : (
                  m['home.button.submit']()
                )}
              </button>

              {/* Footer note */}
              <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-stone-500 text-center leading-relaxed">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {m['home.disclaimer']()}
                </span>
              </p>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-16 sm:mt-20 space-y-5 sm:space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            {CHECK_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="brake-card rounded-[20px] p-5 sm:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b84d8]/10 text-[#086aa8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-[18px] font-semibold text-slate-900">{m[item.titleKey]()}</h2>
                  <p className="mt-2 text-[14px] leading-7 text-slate-600">{m[item.textKey]()}</p>
                </article>
              );
            })}
          </section>

          <section className="brake-card rounded-[22px] p-5 sm:p-7">
            <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0877c7]">
                  {m['home.scenarios.eyebrow']()}
                </p>
                <h2 className="mt-3 text-[24px] sm:text-[28px] font-semibold leading-snug text-slate-900">
                  {m['home.scenarios.title1']()}
                  <br className="hidden sm:block" />
                  {m['home.scenarios.title2']()}
                </h2>
                <p className="mt-4 text-[14px] leading-7 text-slate-600">
                  {m['home.scenarios.text']()}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {SCENARIO_KEYS.map((key) => (
                  <div
                    key={key}
                    className="brake-subpanel rounded-[14px] px-4 py-3 text-[14px] font-medium text-slate-800"
                  >
                    {m[key]()}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="brake-card rounded-[22px] p-5 sm:p-7">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0877c7]">
                <History className="h-4 w-4" />
                {m['home.workflow.title']()}
              </div>
              <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {STEP_KEYS.map((stepKey, index) => (
                  <li
                    key={stepKey}
                    className="relative min-w-0 text-center"
                  >
                    {index < STEP_COUNT - 1 && (
                      <span className="absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-4 hidden h-px bg-[#7ec5f2]/55 sm:block" />
                    )}
                    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#7ec5f2]/70 bg-white text-[12px] font-semibold text-[#0877c7] shadow-[0_6px_14px_rgba(18,92,145,0.07)]">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[12.5px] font-medium leading-5 text-slate-800 sm:text-[12px] lg:text-[12.5px]">
                      {m[stepKey]()}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="brake-card rounded-[22px] p-5 sm:p-7">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0877c7]">
                <Ban className="h-4 w-4" />
                {m['home.boundary.title']()}
              </div>
              <ul className="mt-5 space-y-3 text-[14px] leading-7 text-slate-600">
                <li>{m['home.boundary.item1']()}</li>
                <li>{m['home.boundary.item2']()}</li>
                <li>{m['home.boundary.item3']()}</li>
              </ul>
            </div>
          </section>

          <section className="brake-card rounded-[22px] p-5 sm:p-7">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0877c7]">
              <HelpCircle className="h-4 w-4" />
              {m['home.faq.title']()}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {FAQ_KEYS.map((key) => (
                <article key={key} className="brake-subpanel rounded-[16px] p-4">
                  <h3 className="text-[15px] font-semibold text-slate-900">
                    {m[`home.faq.${key}.question` as keyof typeof m]()}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-7 text-slate-600">
                    {m[`home.faq.${key}.answer` as keyof typeof m]()}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <footer className="brake-card flex flex-col gap-4 rounded-[18px] px-5 py-4 text-center text-[12px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="space-y-1">
              <p>{m['home.footer.tagline']()}</p>
              <p>© {currentYear} {m['home.product_name']()}. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/history" className="hover:text-slate-950">
                {m['home.nav.history']()}
              </Link>
              <Link to="/privacy-policy" className="hover:text-slate-950">
                {m['home.footer.privacy']()}
              </Link>
              <Link to="/terms-of-service" className="hover:text-slate-950">
                {m['home.footer.terms']()}
              </Link>
              <LocaleSelector
                variant="pill"
                className="h-8 border-[#7ec5f2]/45 bg-white/55 px-3 text-xs text-[#075b96] hover:bg-white hover:text-[#064f84]"
              />
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => {
    const locale = getLocale();
    const appUrl = envConfigs.app_url || '';
    const urlFor = (loc: string) =>
      localizeUrl(`${appUrl}/`, { locale: loc as (typeof locales)[number] }).href;
    const title = m['home.seo.title']({}, { locale });
    const description = m['home.seo.description']({}, { locale });
    const canonical = urlFor(locale);
    const image = `${appUrl}/logo.svg`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { property: 'og:image', content: image },
        { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: image },
      ],
      links: [
        { rel: 'canonical', href: canonical },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
});
