import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getCardRecords, deleteCard, SCENE_LABELS, type CalmStatus } from '@/lib/trading';
import { useState, useEffect } from 'react';

const STATUS_STYLE: Record<CalmStatus, { dot: string; text: string; bg: string }> = {
  can_think_but_wait: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  pause_first: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-[#FFF7ED]' },
  strong_pause: { dot: 'bg-orange-600', text: 'text-orange-900', bg: 'bg-orange-50' },
  review_not_trade: { dot: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-stone-100' },
};

function HistoryPage() {
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
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const summarizeThought = (text?: string) => {
    if (!text) return '未记录具体想法';
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return '未记录具体想法';
    return normalized.length > 58 ? `${normalized.slice(0, 58)}…` : normalized;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <span className="font-medium text-slate-800">冷静记录</span>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-5 pb-12 w-full">
        {records.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 leading-[1.9]">
              还没有冷静记录。
              <br />
              下次很想操作时，先来这里停 30 秒。
            </p>
            <Link
              to="/"
              className="inline-flex items-center mt-6 px-6 py-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-colors"
            >
              写下现在的想法
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-400 leading-relaxed mb-5 px-1">
              这些不是交易建议，是你每次上头前留下的刹车痕迹。
            </p>
            <div className="space-y-3">
              {records.map((record) => {
                const style = STATUS_STYLE[record.calmStatus] ?? STATUS_STYLE.pause_first;
                return (
                  <Link
                    key={record.id}
                    to="/card/$id"
                    params={{ id: record.id }}
                    className="block bg-white rounded-[20px] border border-stone-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-5 hover:border-stone-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-[13px] text-slate-400">
                        {formatDate(record.createdAt)} · {SCENE_LABELS[record.type]}
                        {record.symbol ? ` · ${record.symbol}` : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(record.id);
                        }}
                        className="p-1.5 -mr-1 hover:bg-black/5 rounded-lg transition-colors text-slate-300 hover:text-slate-500 shrink-0"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[15px] font-medium text-slate-800 leading-relaxed mb-2">
                      {summarizeThought(record.userThought)}
                    </p>
                    <p className="text-[14px] text-slate-500 leading-relaxed mb-3 line-clamp-2">
                      {record.coreInsight}
                    </p>
                    {record.positionText && (
                      <p className="text-[13px] text-slate-400 leading-relaxed mb-3 line-clamp-1">
                        仓位：{summarizeThought(record.positionText)}
                      </p>
                    )}

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${style.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      <span className={`text-[12px] font-medium ${style.text}`}>{record.calmStatusText}</span>
                    </span>
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
            <h3 className="text-lg font-semibold text-slate-800 mb-2">删除这条记录？</h3>
            <p className="text-slate-500 mb-6 text-sm">删除后无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 px-4 border border-stone-200 rounded-2xl text-slate-700 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 px-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  head: () => ({
    meta: [{ title: '冷静记录 — 交易冷静卡' }],
  }),
});
