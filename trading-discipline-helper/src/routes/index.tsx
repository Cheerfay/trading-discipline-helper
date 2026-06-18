import { createFileRoute, Link } from '@tanstack/react-router';
import { Brain, ArrowRight, History } from 'lucide-react';

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">交易冷静卡</h1>
          <Link
            to="/history"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <History className="w-4 h-4" />
            历史记录
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-6">
            <Brain className="w-8 h-8 text-slate-700" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">交易冷静卡</h1>
          <p className="text-xl text-slate-600 mb-8">上头了？下单前先自查一下</p>
          <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
            交易冷静卡不会告诉你买什么、卖什么。它只帮你在交易前检查：你现在是不是被情绪推着走，仓位是否失控，理由是否充分，退出条件是否清楚。
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <ActionCard
            type="buy"
            title="我想买入"
            description="买入前检查是否冲动、仓位是否合理"
            to="/card/new?type=buy"
          />
          <ActionCard
            type="sell"
            title="我想卖出"
            description="卖出前检查是否符合原计划"
            to="/card/new?type=sell"
          />
          <ActionCard
            type="add"
            title="我想加仓"
            description="加仓前检查是否为了摊低成本"
            to="/card/new?type=add"
          />
          <ActionCard
            type="cut"
            title="我想割肉"
            description="割肉前检查是否受恐慌情绪驱动"
            to="/card/new?type=cut"
          />
          <ActionCard
            type="missed"
            title="我卖飞了，想复盘"
            description="复盘卖飞原因，避免追高买回"
            to="/card/new?type=missed"
          />
          <ActionCard
            type="chase_loss"
            title="我追高亏了，想复盘"
            description="复盘追高原因，识别情绪触发点"
            to="/card/new?type=chase_loss"
          />
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">风险提示</p>
          <p className="text-amber-700">
            本工具仅用于投资纪律检查与自我复盘，不构成任何投资建议。投资有风险，决策需独立判断。
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>交易冷静卡 — 投资纪律检查工具</p>
        </div>
      </footer>
    </div>
  );
}

interface ActionCardProps {
  type: string;
  title: string;
  description: string;
  to: string;
}

function ActionCard({ title, description, to }: ActionCardProps) {
  return (
    <Link
      to={to}
      className="group block p-6 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: '交易冷静卡 — 上头了？下单前先自查一下' },
      {
        name: 'description',
        content: '交易冷静卡不会告诉你买什么、卖什么。它只帮你在交易前检查：你现在是不是被情绪推着走，仓位是否失控，理由是否充分，退出条件是否清楚。',
      },
    ],
  }),
});
