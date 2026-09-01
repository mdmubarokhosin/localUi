import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LuMessageSquare,
  LuBot,
  LuHash,
  LuClock,
  LuTrendingUp,
} from 'react-icons/lu';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import IndexedDB from '../../database/indexedDB';
import type { Conversation, Message } from '../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Helper types ---

interface ConversationStats {
  conv: Conversation;
  messageCount: number;
  estimatedTokens: number;
  model?: string;
  messages: Message[];
}

interface ModelUsageEntry {
  model: string;
  count: number;
  tokens: number;
}

// --- Rough token estimate: ~4 chars per token ---

const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// --- Chart color palette ---

const CHART_COLORS = [
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(236, 72, 153, 0.8)',    // pink
  'rgba(34, 197, 94, 0.8)',     // green
  'rgba(251, 191, 36, 0.8)',    // amber
  'rgba(59, 130, 246, 0.8)',    // blue
  'rgba(168, 85, 247, 0.8)',    // purple
  'rgba(244, 63, 94, 0.8)',     // rose
  'rgba(20, 184, 166, 0.8)',    // teal
  'rgba(249, 115, 22, 0.8)',    // orange
  'rgba(132, 204, 22, 0.8)',    // lime
];

const CHART_COLORS_BORDER = CHART_COLORS.map((c) => c.replace('0.8', '1'));

// --- Component ---

export default function Dashboard() {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationStats, setConversationStats] = useState<ConversationStats[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState(false);

  // Detect dark mode for chart colors
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme')?.includes('dark') ??
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const isDark = document.documentElement.getAttribute('data-theme')?.includes('dark') ??
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    return () => observer.disconnect();
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const allConvs = await IndexedDB.getAllConversations();
        if (cancelled) return;

        const stats: ConversationStats[] = await Promise.all(
          allConvs.map(async (conv) => {
            const msgs = await IndexedDB.getMessages(conv.id);
            const filteredMsgs = msgs.filter((m) => m.type !== 'root');
            const estimatedTokens = filteredMsgs.reduce(
              (sum, m) => sum + estimateTokens(m.content),
              0
            );
            const lastAssistant = [...filteredMsgs]
              .reverse()
              .find((m) => m.role === 'assistant' && m.model);
            return {
              conv,
              messageCount: filteredMsgs.length,
              estimatedTokens,
              model: lastAssistant?.model,
              messages: filteredMsgs,
            };
          })
        );

        if (!cancelled) {
          setConversations(allConvs);
          setConversationStats(stats);
          setLoading(false);
        }
      } catch (err) {
        console.error('Dashboard: failed to load data', err);
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Computed values ---

  const totalConversations = conversations.length;

  const totalMessages = useMemo(
    () => conversationStats.reduce((sum, s) => sum + s.messageCount, 0),
    [conversationStats]
  );

  const totalEstimatedTokens = useMemo(
    () => conversationStats.reduce((sum, s) => sum + s.estimatedTokens, 0),
    [conversationStats]
  );

  const modelUsage = useMemo((): ModelUsageEntry[] => {
    const map = new Map<string, { count: number; tokens: number }>();
    for (const stat of conversationStats) {
      const model = stat.model ?? t('dashboard.unknownModel', 'Unknown');
      const entry = map.get(model) ?? { count: 0, tokens: 0 };
      entry.count += 1;
      entry.tokens += stat.estimatedTokens;
      map.set(model, entry);
    }
    return Array.from(map.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [conversationStats, t]);

  const recentConversations = useMemo(
    () =>
      [...conversationStats]
        .sort((a, b) => b.conv.lastModified - a.conv.lastModified)
        .slice(0, 10),
    [conversationStats]
  );

  // Activity data: conversations per day (last 14 days)
  const activityData = useMemo(() => {
    const days: { label: string; count: number; tokens: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayStats = conversationStats.filter(
        (s) => s.conv.lastModified >= date.getTime() && s.conv.lastModified < nextDate.getTime()
      );
      const dayTokens = dayStats.reduce((sum, s) => sum + s.estimatedTokens, 0);

      days.push({
        label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count: dayStats.length,
        tokens: dayTokens,
      });
    }
    return days;
  }, [conversationStats]);

  // Messages by role chart data
  const messagesByRoleData = useMemo(() => {
    let userMsgs = 0;
    let assistantMsgs = 0;
    let systemMsgs = 0;
    for (const stat of conversationStats) {
      for (const msg of stat.messages) {
        if (msg.role === 'user') userMsgs++;
        else if (msg.role === 'assistant') assistantMsgs++;
        else if (msg.role === 'system') systemMsgs++;
      }
    }
    return { userMsgs, assistantMsgs, systemMsgs };
  }, [conversationStats]);

  const formatDate = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  // Chart defaults
  const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';

  // --- Chart configurations ---

  // 1. Activity Bar Chart
  const activityChartConfig = useMemo(
    () => ({
      type: 'bar' as const,
      data: {
        labels: activityData.map((d) => d.label),
        datasets: [
          {
            label: t('dashboard.conversations', 'Conversations'),
            data: activityData.map((d) => d.count),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: t('dashboard.activityChart', 'Activity (Last 14 Days)'),
            color: textColor,
            font: { size: 14, weight: 'bold' as const },
            padding: { bottom: 16 },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              stepSize: 1,
              precision: 0,
            },
          },
        },
      },
    }),
    [activityData, darkMode, textColor, gridColor, t]
  );

  // 2. Model Distribution Doughnut Chart
  const modelDoughnutConfig = useMemo(
    () => ({
      type: 'doughnut' as const,
      data: {
        labels: modelUsage.map((e) => e.model),
        datasets: [
          {
            data: modelUsage.map((e) => e.count),
            backgroundColor: CHART_COLORS.slice(0, modelUsage.length),
            borderColor: CHART_COLORS_BORDER.slice(0, modelUsage.length),
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              color: textColor,
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 11 },
            },
          },
          title: {
            display: true,
            text: t('dashboard.modelDistribution', 'Model Distribution'),
            color: textColor,
            font: { size: 14, weight: 'bold' as const },
            padding: { bottom: 16 },
          },
        },
      },
    }),
    [modelUsage, darkMode, textColor, t]
  );

  // 3. Token Usage Line Chart
  const tokenLineConfig = useMemo(
    () => ({
      type: 'line' as const,
      data: {
        labels: activityData.map((d) => d.label),
        datasets: [
          {
            label: t('dashboard.estTokens', 'Est. Tokens'),
            data: activityData.map((d) => d.tokens),
            borderColor: 'rgba(34, 197, 94, 0.9)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: t('dashboard.tokenUsage', 'Token Usage Trend'),
            color: textColor,
            font: { size: 14, weight: 'bold' as const },
            padding: { bottom: 16 },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (value: string | number) => {
                const num = typeof value === 'string' ? parseFloat(value) : value;
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
                return num;
              },
            },
          },
        },
      },
    }),
    [activityData, darkMode, textColor, gridColor, t]
  );

  // 4. Message Role Doughnut
  const messageRoleConfig = useMemo(
    () => ({
      type: 'doughnut' as const,
      data: {
        labels: [
          t('dashboard.userMessages', 'User'),
          t('dashboard.assistantMessages', 'Assistant'),
          t('dashboard.systemMessages', 'System'),
        ],
        datasets: [
          {
            data: [
              messagesByRoleData.userMsgs,
              messagesByRoleData.assistantMsgs,
              messagesByRoleData.systemMsgs,
            ],
            backgroundColor: [
              'rgba(99, 102, 241, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
            ],
            borderColor: [
              'rgba(99, 102, 241, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 191, 36, 1)',
            ],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              color: textColor,
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 11 },
            },
          },
          title: {
            display: true,
            text: t('dashboard.messageRoles', 'Message Distribution'),
            color: textColor,
            font: { size: 14, weight: 'bold' as const },
            padding: { bottom: 16 },
          },
        },
      },
    }),
    [messagesByRoleData, darkMode, textColor, t]
  );

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto" ref={chartRef}>
      {/* Page Title */}
      <h1 className="text-2xl font-bold">
        {t('dashboard.title', 'Dashboard')}
      </h1>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body items-center text-center p-4">
            <LuMessageSquare className="text-2xl md:text-3xl text-primary" />
            <h2 className="card-title text-xs md:text-sm">
              {t('dashboard.totalConversations', 'Total Conversations')}
            </h2>
            <p className="text-2xl md:text-3xl font-bold stat-value">{totalConversations}</p>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body items-center text-center p-4">
            <LuBot className="text-2xl md:text-3xl text-secondary" />
            <h2 className="card-title text-xs md:text-sm">
              {t('dashboard.totalMessages', 'Total Messages')}
            </h2>
            <p className="text-2xl md:text-3xl font-bold stat-value">{totalMessages}</p>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body items-center text-center p-4">
            <LuHash className="text-2xl md:text-3xl text-accent" />
            <h2 className="card-title text-xs md:text-sm">
              {t('dashboard.estimatedTokens', 'Est. Tokens Used')}
            </h2>
            <p className="text-2xl md:text-3xl font-bold stat-value">
              {totalEstimatedTokens >= 1000000
                ? (totalEstimatedTokens / 1000000).toFixed(1) + 'M'
                : totalEstimatedTokens >= 1000
                  ? (totalEstimatedTokens / 1000).toFixed(1) + 'K'
                  : totalEstimatedTokens}
            </p>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body items-center text-center p-4">
            <LuTrendingUp className="text-2xl md:text-3xl text-info" />
            <h2 className="card-title text-xs md:text-sm">
              {t('dashboard.modelsUsed', 'Models Used')}
            </h2>
            <p className="text-2xl md:text-3xl font-bold stat-value">{modelUsage.length}</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Activity Bar + Model Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card bg-base-200 shadow-sm">
          <div className="card-body p-4 md:p-6">
            <div className="h-64 md:h-80">
              {activityData.some((d) => d.count > 0) ? (
                <Bar {...activityChartConfig} />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/40">
                  {t('dashboard.noActivityData', 'No activity data yet')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 md:p-6">
            <div className="h-64 md:h-80">
              {modelUsage.length > 0 ? (
                <Doughnut {...modelDoughnutConfig} />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/40">
                  {t('dashboard.noModels', 'No model data available.')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Token Line + Message Role Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card bg-base-200 shadow-sm">
          <div className="card-body p-4 md:p-6">
            <div className="h-64 md:h-80">
              {activityData.some((d) => d.tokens > 0) ? (
                <Line {...tokenLineConfig} />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/40">
                  {t('dashboard.noTokenData', 'No token usage data yet')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 md:p-6">
            <div className="h-64 md:h-80">
              {totalMessages > 0 ? (
                <Doughnut {...messageRoleConfig} />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/40">
                  {t('dashboard.noMessageData', 'No message data yet')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations Table */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title">
            <LuClock className="text-xl" />
            {t('dashboard.recentConversations', 'Recent Conversations')}
          </h2>
          {recentConversations.length === 0 ? (
            <p className="text-base-content/60">
              {t('dashboard.noConversations', 'No conversations yet.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>{t('dashboard.table.name', 'Name')}</th>
                    <th>{t('dashboard.table.messages', 'Messages')}</th>
                    <th>{t('dashboard.table.model', 'Model')}</th>
                    <th className="hidden sm:table-cell">{t('dashboard.table.lastModified', 'Last Modified')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversations.map((stat) => (
                    <tr key={stat.conv.id}>
                      <td className="font-medium max-w-[200px] truncate">
                        {stat.conv.name}
                      </td>
                      <td>{stat.messageCount}</td>
                      <td className="max-w-[120px] truncate">
                        {stat.model ?? '—'}
                      </td>
                      <td className="whitespace-nowrap text-sm text-base-content/70 hidden sm:table-cell">
                        {formatDate(stat.conv.lastModified)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
