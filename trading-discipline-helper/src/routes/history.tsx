import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getCardRecords, deleteCard, type CalmStatus, type Scene } from '@/lib/trading';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { useState, useEffect } from 'react';

const STATUS_STYLE: Record<CalmStatus, { dot: string; text: string; bg: string }> = {
  can_think_but_wait: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  pause_first: { dot: 'bg-sky-500', text: 'text-sky-800', bg: 'bg-sky-100' },
  strong_pause: { dot: 'bg-[#0877c7]', text: 'text-[#075b96]', bg: 'bg-[#dff2ff]' },
  review_not_trade: { dot: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-sky-50' },
};

const SCENE_LABEL_KEYS: Record<Scene, keyof typeof m> = {
  buy: 'card.scene.buy',
  add: 'card.scene.add',
  take_profit: 'card.scene.take_profit',
  cut: 'card.scene.cut',
  missed: 'card.scene.missed',
  chase_loss: 'card.scene.chase_loss',
  unclear: 'card.scene.unclear',
};

function HistoryPage() {
  const locale = getLocale();
  const [records, setRecords] = useState(getCardRecords());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getCardRecords());
  }, []);

  const handleDelete = (id: string) => {
    deleteCard(id);
    setRecords(getCardRecords());
    setDeleteId(null);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const summarizeThought = (text?: string) => {
    if (!text) return m['history.thought_empty']();
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return m['history.thought_empty']();
    return normalized.length > 58 ? `${normalized.slice(0, 58)}…` : normalized;
  };

  return (
    <div className="brake-page min-h-screen flex flex-col text-slate-900">
      {/* Header */}
      <header className="brake-nav px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-white drop-shadow-[0_1px_8px_rgba(5,54,99,0.2)]" />
          </Link>
          <span className="inline-flex items-center gap-2.5 font-semibold text-white drop-shadow-[0_1px_8px_rgba(5,54,99,0.24)]">
            <img src="/logo.svg" alt="" className="h-6 w-6 rounded-lg shadow-[0_6px_16px_rgba(5,54,99,0.2)]" />
            {m['history.header.title']()}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-5 pb-12 w-full">
        {records.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-20">
            <h1 className="text-[28px] font-semibold text-white mb-3">{m['history.empty.title']()}</h1>
            <p className="text-white/86 leading-[1.9] drop-shadow-[0_1px_10px_rgba(5,54,99,0.18)]">
              {m['history.empty.text']()}
            </p>
            <Link
              to="/"
              className="brake-primary inline-flex items-center mt-6 px-6 py-3 text-white rounded-xl transition-colors"
            >
              {m['history.empty.action']()}
            </Link>
          </div>
        ) : (
          <>
            <div className="brake-card mb-6 rounded-[22px] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-[26px] sm:text-[30px] font-semibold text-black leading-tight">
                    {m['history.title']()}
                  </h1>
                  <p className="mt-2 text-[14px] text-black/[0.58] leading-relaxed">
                    {m['history.subtitle']()}
                  </p>
                </div>
                <div className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[13px] text-black/56">
                  {m['history.count']({ count: records.length })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {records.map((record) => {
                const style = STATUS_STYLE[record.calmStatus] ?? STATUS_STYLE.pause_first;
                return (
                  <Link
                    key={record.id}
                    to="/card/$id"
                    params={{ id: record.id }}
                    className="brake-record-card flex min-h-[230px] flex-col rounded-[18px] p-5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-[13px] text-slate-400">
                        {formatDate(record.createdAt)} · {m[SCENE_LABEL_KEYS[record.type]]()}
                        {record.symbol ? ` · ${record.symbol}` : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(record.id);
                        }}
                        className="p-1.5 -mr-1 hover:bg-black/[0.06] rounded-lg transition-colors text-black/25 hover:text-black/55 shrink-0"
                        title={m['history.delete.button_title']()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[15px] font-semibold text-black leading-relaxed mb-2">
                      {summarizeThought(record.userThought)}
                    </p>
                    <p className="text-[14px] text-black/[0.58] leading-relaxed mb-3 line-clamp-2">
                      {record.coreInsight}
                    </p>
                    {record.positionText && (
                      <p className="text-[13px] text-slate-400 leading-relaxed mb-3 line-clamp-1">
                        {m['history.position_prefix']()}：{summarizeThought(record.positionText)}
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className={`text-[12px] font-medium ${style.text}`}>{record.calmStatusText}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{m['history.delete.title']()}</h3>
            <p className="text-slate-500 mb-6 text-sm">{m['history.delete.text']()}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 px-4 border border-stone-200 rounded-2xl text-slate-700 hover:bg-stone-50 transition-colors"
              >
                {m['history.delete.cancel']()}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="brake-primary flex-1 py-2.5 px-4 text-white rounded-2xl transition-colors"
              >
                {m['history.delete.confirm']()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/history')({
  loader: () => {
    const locale = getLocale();
    return { title: m['history.seo.title']({}, { locale }) };
  },
  component: HistoryPage,
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title ?? m['history.seo.title']() }],
  }),
});
