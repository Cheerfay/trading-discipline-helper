import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, Trash2, History as HistoryIcon } from 'lucide-react';
import { getCardRecords, deleteReport, type TradeType, type CalmStatus } from '@/lib/trading';
import { useState, useEffect } from 'react';

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '买入',
  sell: '卖出',
  add: '加仓',
  cut: '割肉',
  missed: '卖飞复盘',
  chase_loss: '追高亏损复盘',
};

const CALM_STATUS_BADGE: Record<CalmStatus, { label: string; cls: string; dot: string }> = {
  calm: { label: '可以理性决策', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  pause: { label: '建议先暂停', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  cool_down: { label: '强烈建议冷静', cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
};

function HistoryPage() {
  const [records, setRecords] = useState(getCardRecords());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getCardRecords());
  }, []);

  const handleDelete = (id: string) => {
    deleteReport(id);
    setRecords(getCardRecords());
    setDeleteId(null);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">历史记录</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <HistoryIcon className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">还没有冷静卡记录</h2>
            <p className="text-slate-500 mb-6">创建你的第一张冷静卡，开始投资纪律检查</p>
            <Link
              to="/card/new?type=buy"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              创建冷静卡
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => {
              const badge = CALM_STATUS_BADGE[record.calmStatus] ?? CALM_STATUS_BADGE.pause;
              return (
                <Link
                  key={record.id}
                  to="/card/$id"
                  params={{ id: record.id }}
                  className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{record.symbol}</h3>
                        <p className="text-sm text-slate-500">
                          {TRADE_TYPE_LABELS[record.type]} · {formatDate(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteId(record.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${badge.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    <span className="text-xs font-medium">{badge.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6 text-sm">删除后无法恢复，确定要删除这份冷静卡吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
    meta: [{ title: '历史记录 — 交易冷静卡' }],
  }),
});
