'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gavel,
  Zap,
  Clock,
  Sparkles,
  Trophy,
  Tag,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Gift,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowUpRight,
  X,
  Info,
  Receipt,
  History,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export interface AuctionItem {
  id: string;
  title: string;
  category: 'Equipamento' | 'Mentoria' | 'Swag Oficial' | 'Certificação' | 'Livros' | string;
  description: string;
  imageUrl?: string;
  iconType: 'keyboard' | 'mentorship' | 'swag' | 'book' | 'cert' | 'headphone' | string;
  currentBid: number;
  minNextBid: number;
  highestBidder: string;
  isMyHighestBid: boolean;
  totalBids: number;
  endsInSeconds: number;
  marketValue: string;
  isFeatured?: boolean;
  status?: string;
}

export type StudentItemBidStatus = 'LIDERANDO' | 'SUPERADO' | 'ARREMATADO' | 'ENCERRADO';

export interface StudentBidHistoryEntry {
  id: string;
  amount: number;
  createdAt: string;
}

export interface StudentAuctionItemBidSummary {
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  itemDescription: string;
  itemIconType: string;
  itemStatus: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  itemCurrentBid: number;
  highestBidderId: string | null;
  highestBidderName: string;
  isCurrentUserLeading: boolean;
  studentStatus: StudentItemBidStatus;
  statusLabel: string;
  studentLastBid: number;
  studentLastBidAt: string;
  reservedCoins: number;
  hasReleasedReservation: boolean;
  winningBid?: number;
  spentCoins?: number;
  bidsHistory: StudentBidHistoryEntry[];
}

export interface StudentCoinTransactionItem {
  id: string;
  type: 'BASELINE' | 'EARNED' | 'SPENT' | 'MANUAL';
  friendlyType: string;
  amount: number;
  description: string;
  createdAt: string;
}

export const INITIAL_AUCTION_ITEMS: AuctionItem[] = [
  {
    id: 'auc_1',
    title: 'Teclado Mecânico Keychron K2 RGB Wireless',
    category: 'Equipamento',
    description: 'Switches Gateron Brown táteis, layout 75%, corpo em alumínio e conexão Bluetooth/USB-C.',
    iconType: 'keyboard',
    currentBid: 850,
    minNextBid: 900,
    highestBidder: 'Lucas Andrade',
    isMyHighestBid: false,
    totalBids: 14,
    endsInSeconds: 3600 * 24 + 1200,
    marketValue: 'R$ 680,00',
    isFeatured: true,
  },
  {
    id: 'auc_2',
    title: 'Mentoria Individual 1-on-1 com CTO Parceiro (2h)',
    category: 'Mentoria',
    description: 'Code review detalhado do seu GitHub, preparação para entrevistas técnicas sênior e direcionamento de carreira.',
    iconType: 'mentorship',
    currentBid: 1100,
    minNextBid: 1150,
    highestBidder: 'Você',
    isMyHighestBid: true,
    totalBids: 19,
    endsInSeconds: 3600 * 28 + 600,
    marketValue: 'R$ 950,00',
    isFeatured: true,
  },
  {
    id: 'auc_3',
    title: 'Moletom Exclusivo Fuctura Dev Edition (Preto/Ciano)',
    category: 'Swag Oficial',
    description: 'Tecido premium 100% algodão, capuz forrado, bolso canguru e bordado de alta definição Fuctura Software School.',
    iconType: 'swag',
    currentBid: 520,
    minNextBid: 570,
    highestBidder: 'Mariana Costa',
    isMyHighestBid: false,
    totalBids: 9,
    endsInSeconds: 3600 * 18 + 400,
    marketValue: 'R$ 220,00',
  },
  {
    id: 'auc_4',
    title: 'Voucher 100% Pago Certificação Oracle Java ou LPI-1',
    category: 'Certificação',
    description: 'Exame oficial internacional com direito a retake. Agendamento presencial no centro autorizado de Recife ou remoto.',
    iconType: 'cert',
    currentBid: 1500,
    minNextBid: 1550,
    highestBidder: 'Sem lances',
    isMyHighestBid: false,
    totalBids: 0,
    endsInSeconds: 3600 * 42,
    marketValue: 'R$ 1.650,00',
  },
  {
    id: 'auc_5',
    title: 'Headset Gamer HyperX Cloud II Red 7.1 Virtual',
    category: 'Equipamento',
    description: 'Drivers de 53mm com áudio espacial imersivo, microfone com cancelamento de ruído e espumas memory foam para maratonas de código.',
    iconType: 'headphone',
    currentBid: 410,
    minNextBid: 460,
    highestBidder: 'Rodrigo Oliveira',
    isMyHighestBid: false,
    totalBids: 8,
    endsInSeconds: 3600 * 14 + 180,
    marketValue: 'R$ 550,00',
  },
];

interface AuctionSectionProps {
  userRole?: 'ALUNO' | 'PROFESSOR' | 'DIRETOR';
  userName?: string;
  userBalance?: number;
  coinBalance?: number;
  reservedCoins?: number;
  availableCoins?: number;
  onBidSuccess?: (newBalance: number) => void;
  compactView?: boolean;
  externalOpenItem?: AuctionItem | null;
  onResetExternalOpenItem?: () => void;
}

export const AuctionSection: React.FC<AuctionSectionProps> = ({
  userRole = 'ALUNO',
  userName = 'Você',
  userBalance = 1240,
  coinBalance: propCoinBalance,
  reservedCoins: propReservedCoins,
  availableCoins: propAvailableCoins,
  onBidSuccess,
  compactView = false,
  externalOpenItem,
  onResetExternalOpenItem,
}) => {
  const [items, setItems] = useState<AuctionItem[]>(INITIAL_AUCTION_ITEMS);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [biddingSuccess, setBiddingSuccess] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'lots' | 'my-bids' | 'statement'>('lots');
  const [myBids, setMyBids] = useState<StudentAuctionItemBidSummary[]>([]);
  const [coinTransactions, setCoinTransactions] = useState<StudentCoinTransactionItem[]>([]);
  const [expandedBidItemId, setExpandedBidItemId] = useState<string | null>(null);
  const [myBidsFilter, setMyBidsFilter] = useState<'all' | 'active' | 'finished'>('all');

  const [studentCoins, setStudentCoins] = useState<{
    coinBalance: number;
    reservedCoins: number;
    availableCoins: number;
  }>({
    coinBalance: propCoinBalance ?? userBalance,
    reservedCoins: propReservedCoins ?? 0,
    availableCoins: propAvailableCoins ?? userBalance,
  });
  const currentBalance = studentCoins.availableCoins;

  const loadAuctionData = useCallback(() => {
    fetch('/api/auction')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items);
        }
        if (data.studentCoins) {
          setStudentCoins({
            coinBalance: data.studentCoins.coinBalance ?? 0,
            reservedCoins: data.studentCoins.reservedCoins ?? 0,
            availableCoins: data.studentCoins.availableCoins ?? 0,
          });
        }
        if (data.myBids && Array.isArray(data.myBids)) {
          setMyBids(data.myBids);
        }
        if (data.coinTransactions && Array.isArray(data.coinTransactions)) {
          setCoinTransactions(data.coinTransactions);
        }
      })
      .catch(() => {
        // Falha silenciosa de conexão mantendo dados locais
      });
  }, []);

  useEffect(() => {
    loadAuctionData();
  }, [loadAuctionData]);

  useEffect(() => {
    if (!externalOpenItem) return;
    const timer = setTimeout(() => {
      setSelectedItem(externalOpenItem);
      setBidAmount(externalOpenItem.minNextBid);
      setBiddingSuccess(null);
      setBidError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [externalOpenItem]);

  // Live countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          endsInSeconds: Math.max(0, item.endsInSeconds - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Encerrado';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenBidModal = (item: AuctionItem) => {
    setSelectedItem(item);
    setBidAmount(item.minNextBid);
    setBiddingSuccess(null);
    setBidError(null);
  };

  const handleOpenBidForItemById = (itemId: string) => {
    const targetItem = items.find((it) => it.id === itemId);
    if (targetItem) {
      handleOpenBidModal(targetItem);
    }
  };

  const handleConfirmBid = async () => {
    if (!selectedItem) return;
    setBidError(null);

    if (bidAmount < selectedItem.minNextBid) {
      setBidError(`O lance mínimo precisa ser de pelo menos ${selectedItem.minNextBid} Coins.`);
      return;
    }

    if (bidAmount > currentBalance) {
      setBidError(`Saldo insuficiente de Coins. Você possui ${currentBalance} Coins disponíveis e o lance é de ${bidAmount} Coins.`);
      return;
    }

    try {
      const res = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          amount: bidAmount,
          bidderName: `${userName} (Você)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBidError(data.error || 'Erro ao processar lance.');
        return;
      }

      if (data.item) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === selectedItem.id
              ? {
                  ...it,
                  currentBid: data.item.currentBid,
                  minNextBid: data.item.minNextBid,
                  highestBidder: `${userName} (Você)`,
                  isMyHighestBid: true,
                  totalBids: data.item.totalBids,
                }
              : it
          )
        );
      }

      if (data.studentCoins) {
        setStudentCoins({
          coinBalance: data.studentCoins.coinBalance ?? 0,
          reservedCoins: data.studentCoins.reservedCoins ?? 0,
          availableCoins: data.studentCoins.availableCoins ?? 0,
        });
        if (onBidSuccess) onBidSuccess(data.studentCoins.availableCoins ?? 0);
      }

      if (data.myBids && Array.isArray(data.myBids)) {
        setMyBids(data.myBids);
      } else {
        loadAuctionData();
      }

      setBiddingSuccess(`Parabéns! Seu lance de ${bidAmount} Coins foi registrado com sucesso e você lidera a disputa!`);
      setTimeout(() => {
        setSelectedItem(null);
        setBiddingSuccess(null);
      }, 2000);
    } catch (err: any) {
      setBidError(err.message || 'Erro de conexão ao enviar lance.');
    }
  };

  const getItemVisualBadge = (iconType: string) => {
    switch (iconType) {
      case 'keyboard':
        return { emoji: '⌨️', bg: 'from-blue-600/30 to-indigo-600/20', border: 'border-blue-500/30' };
      case 'mentorship':
        return { emoji: '🚀', bg: 'from-amber-600/30 to-rose-600/20', border: 'border-amber-500/30' };
      case 'cert':
        return { emoji: '📜', bg: 'from-emerald-600/30 to-teal-600/20', border: 'border-emerald-500/30' };
      case 'swag':
        return { emoji: '👕', bg: 'from-cyan-600/30 to-blue-600/20', border: 'border-cyan-500/30' };
      case 'headphone':
        return { emoji: '🎧', bg: 'from-purple-600/30 to-indigo-600/20', border: 'border-purple-500/30' };
      case 'book':
      default:
        return { emoji: '📚', bg: 'from-slate-700/40 to-slate-800/20', border: 'border-slate-700' };
    }
  };

  const filteredItems = items.filter((it) => {
    if (filterCategory === 'all') return true;
    return it.category.toLowerCase().includes(filterCategory.toLowerCase());
  });

  const activeMyBids = myBids.filter((b) => b.itemStatus !== 'FINISHED');
  const finishedMyBids = myBids.filter((b) => b.itemStatus === 'FINISHED');
  const leadingCount = myBids.filter((b) => b.studentStatus === 'LIDERANDO').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner do Leilão com Saldo e Explicação */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-[#17130b] via-[#1a140d] to-[#121927] p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Gavel className="w-3.5 h-3.5" /> Leilão Fuctura &bull; Temporada Oficial
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Itens em Disputa com suas Coins Fuctura
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Você pode receber Coins por atividades e recompensas da Fuctura. Use seu saldo livre para dar lances nos lotes em disputa.
            </p>
          </div>

          {/* Triplo Indicador de Saldo (Clicáveis como atalhos) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            {/* Saldo Total */}
            <button
              onClick={() => setViewMode('statement')}
              className={`flex-1 sm:flex-initial rounded-2xl border px-3.5 py-2 text-center min-w-[90px] transition-all cursor-pointer ${
                viewMode === 'statement'
                  ? 'border-amber-400 bg-amber-500/20 shadow-md'
                  : 'border-slate-700/60 bg-slate-900/80 hover:border-slate-500'
              }`}
              title="Clique para ver o Extrato de Coins"
            >
              <span className="font-mono text-base font-bold text-slate-200 block">
                {studentCoins.coinBalance.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">Total</span>
            </button>

            {/* Em Lances / Reservado */}
            <button
              onClick={() => setViewMode('my-bids')}
              className={`flex-1 sm:flex-initial rounded-2xl border px-3.5 py-2 text-center min-w-[90px] transition-all cursor-pointer ${
                viewMode === 'my-bids'
                  ? 'border-amber-400 bg-amber-500/25 shadow-md'
                  : 'border-amber-500/30 bg-amber-500/10 hover:border-amber-400'
              }`}
              title="Clique para ver Meus Lances"
            >
              <span className="font-mono text-base font-bold text-amber-300 block">
                {studentCoins.reservedCoins.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-amber-300/80 font-medium block">Em lances</span>
            </button>

            {/* Disponível */}
            <button
              onClick={() => setViewMode('lots')}
              className={`w-full sm:w-auto rounded-2xl border px-3.5 py-2 text-center min-w-[100px] shadow-sm transition-all cursor-pointer ${
                viewMode === 'lots'
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-md ring-1 ring-emerald-400/30'
                  : 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400'
              }`}
              title="Clique para ver os lotes disponíveis"
            >
              <div className="flex items-center justify-center gap-1 font-mono text-base font-black text-emerald-400">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                <span>{studentCoins.availableCoins.toLocaleString('pt-BR')}</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold block">Disponíveis</span>
            </button>
          </div>
        </div>

        {/* Explicação de reservas */}
        <div className="relative z-10 mt-3 pt-3 border-t border-amber-500/20 text-[11px] text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>Coins reservadas</strong> continuam na sua conta, mas ficam comprometidas enquanto você lidera o lote. Se outro aluno superar seu lance, elas voltam imediatamente para <strong>disponíveis</strong>. Ao arrematar o lote no encerramento, são debitadas definitivamente.
          </span>
        </div>
      </div>

      {/* 2. Sub-navegação do Leilão: Lotes, Meus Lances, Extrato de Coins */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setViewMode('lots')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'lots'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Lotes em Disputa ({items.length})</span>
          </button>

          <button
            onClick={() => setViewMode('my-bids')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'my-bids'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Meus Lances</span>
            {myBids.length > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  viewMode === 'my-bids'
                    ? 'bg-slate-950 text-amber-300'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {myBids.length}
              </span>
            )}
            {leadingCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" title="Você está liderando lote(s)" />
            )}
          </button>

          <button
            onClick={() => setViewMode('statement')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'statement'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Extrato de Coins</span>
            {coinTransactions.length > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  viewMode === 'statement'
                    ? 'bg-slate-950 text-amber-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {coinTransactions.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden lg:inline px-2">
          {viewMode === 'lots' && 'Lances são processados em tempo real'}
          {viewMode === 'my-bids' && `${leadingCount} lote(s) liderado(s) por você`}
          {viewMode === 'statement' && 'Histórico auditado no ledger PostgreSQL'}
        </span>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: CATÁLOGO GERAL DE LOTES EM DISPUTA */}
      {/* ============================================================== */}
      {viewMode === 'lots' && (
        <div className="space-y-5">
          {/* Barra de Filtro de Categorias */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos os Itens ({items.length})
            </button>
            <button
              onClick={() => setFilterCategory('Equipamento')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Equipamento'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Equipamentos Tech
            </button>
            <button
              onClick={() => setFilterCategory('Mentoria')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Mentoria'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mentorias &amp; Carreira
            </button>
            <button
              onClick={() => setFilterCategory('Certificação')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'Certificação'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Certificações
            </button>
          </div>

          {/* Grid de Itens */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const visual = getItemVisualBadge(item.iconType);
              const isEndingSoon = item.endsInSeconds < 3600 * 12;

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between rounded-3xl border p-5 backdrop-blur-md transition-all hover:-translate-y-1 ${
                    item.isMyHighestBid
                      ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 via-slate-900 to-slate-950 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/90'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" />
                        {item.category}
                      </span>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                          isEndingSoon
                            ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20 animate-pulse'
                            : 'text-slate-300 bg-slate-800/80 border border-slate-700/60'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatCountdown(item.endsInSeconds)}</span>
                      </div>
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.bg} border ${visual.border} text-xl shadow-inner`}
                      >
                        {visual.emoji}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Valor de mercado: <strong className="text-slate-300">{item.marketValue}</strong>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                      {item.description}
                    </p>

                    {/* Leading Bid Status */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Lance atual:</span>
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {item.currentBid} Coins
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Líder:</span>
                        <span
                          className={`font-semibold truncate max-w-[150px] ${
                            item.isMyHighestBid ? 'text-emerald-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          {item.highestBidder}
                        </span>
                      </div>

                      {item.isMyHighestBid && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Você está liderando este lote!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Next Bid requirement */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
                      <span>Próximo lance mínimo:</span>
                      <span className="font-mono font-bold text-white">{item.minNextBid} Coins</span>
                    </div>

                    <button
                      onClick={() => handleOpenBidModal(item)}
                      disabled={currentBalance < item.minNextBid}
                      className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black transition-all active:scale-[0.98] cursor-pointer ${
                        item.isMyHighestBid
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400'
                          : currentBalance >= item.minNextBid
                          ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <Gavel className="w-4 h-4" />
                      <span>
                        {item.isMyHighestBid
                          ? 'Aumentar Meu Lance'
                          : currentBalance >= item.minNextBid
                          ? 'Dar Lance com Coins'
                          : `Saldo Insuficiente (${currentBalance} Coins)`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: MEUS LANCES (HISTÓRICO E SITUAÇÃO REAL DO ALUNO) */}
      {/* ============================================================== */}
      {viewMode === 'my-bids' && (
        <div className="space-y-6">
          {myBids.length === 0 ? (
            /* Estado Vazio - Nunca Participou */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 sm:p-12 text-center backdrop-blur-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
                <Gavel className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Você ainda não participou de nenhum lote.
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                Explore os itens disponíveis da temporada e dê o seu primeiro lance com as Coins conquistadas em aula!
              </p>
              <button
                onClick={() => setViewMode('lots')}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Gavel className="w-4 h-4" />
                <span>Ver Lotes em Disputa</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filtro secundário de Meus Lances */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMyBidsFilter('all')}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                    myBidsFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Todos ({myBids.length})
                </button>
                <button
                  onClick={() => setMyBidsFilter('active')}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                    myBidsFilter === 'active'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Lotes Ativos ({activeMyBids.length})
                </button>
                <button
                  onClick={() => setMyBidsFilter('finished')}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                    myBidsFilter === 'finished'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Lotes Encerrados ({finishedMyBids.length})
                </button>
              </div>

              {/* GRUPO 1: LOTES ATIVOS */}
              {(myBidsFilter === 'all' || myBidsFilter === 'active') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Lotes Ativos em Andamento ({activeMyBids.length})</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {leadingCount > 0 ? `${leadingCount} com reserva ativa` : 'Nenhum liderado no momento'}
                    </span>
                  </div>

                  {activeMyBids.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                      Você não está participando de nenhum lote ativo no momento.
                      <button
                        onClick={() => setViewMode('lots')}
                        className="block mx-auto mt-2 text-cyan-400 hover:underline font-semibold"
                      >
                        Ver lotes abertos &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activeMyBids.map((bidItem) => {
                        const visual = getItemVisualBadge(bidItem.itemIconType);
                        const isExpanded = expandedBidItemId === bidItem.itemId;
                        const isLeading = bidItem.studentStatus === 'LIDERANDO';

                        return (
                          <div
                            key={bidItem.itemId}
                            className={`rounded-2xl border p-4 sm:p-5 transition-all backdrop-blur-md ${
                              isLeading
                                ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-slate-900/90 to-slate-950 shadow-lg shadow-emerald-500/5'
                                : 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              {/* Left Info */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.bg} border ${visual.border} text-lg shadow-inner`}
                                >
                                  {visual.emoji}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                      {bidItem.itemCategory}
                                    </span>
                                    {/* SITUAÇÃO DO ALUNO (DERIVADA NO BACKEND) */}
                                    {isLeading ? (
                                      <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Você está liderando</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-amber-400" />
                                        <span>Seu lance foi superado</span>
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                                    {bidItem.itemTitle}
                                  </h4>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                    <span>Líder atual: <strong className="text-slate-200">{bidItem.highestBidderName}</strong></span>
                                    <span>&bull;</span>
                                    <span>Lance do lote: <strong className="text-amber-400 font-mono">{bidItem.itemCurrentBid} Coins</strong></span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Pricing & Actions */}
                              <div className="flex flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2">
                                  <span className="text-[11px] text-slate-400">Seu último lance:</span>
                                  <span className="font-mono text-base font-bold text-white">
                                    {bidItem.studentLastBid} Coins
                                  </span>
                                </div>

                                {/* COINS RESERVADAS OU LIBERADAS */}
                                {isLeading ? (
                                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                                    <Coins className="w-3.5 h-3.5" />
                                    <span>{bidItem.reservedCoins.toLocaleString('pt-BR')} Coins reservadas</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-xl">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Coins liberadas para uso</span>
                                  </div>
                                )}

                                {!isLeading && (
                                  <button
                                    onClick={() => handleOpenBidForItemById(bidItem.itemId)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer mt-1"
                                  >
                                    <Gavel className="w-3.5 h-3.5" />
                                    <span>Cobrir Lance</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Acordeão do Histórico de Lances do Aluno neste Lote */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                              <button
                                onClick={() => setExpandedBidItemId(isExpanded ? null : bidItem.itemId)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Histórico dos seus lances neste lote ({bidItem.bidsHistory.length})</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Último em {formatDateTime(bidItem.studentLastBidAt)}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Seus lances em ordem cronológica:
                                </span>
                                {bidItem.bidsHistory.map((b, idx) => (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0"
                                  >
                                    <span className="text-slate-300 font-medium">
                                      Lance #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-amber-400 font-bold">
                                        {b.amount} Coins
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {formatDateTime(b.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* GRUPO 2: LOTES ENCERRADOS */}
              {(myBidsFilter === 'all' || myBidsFilter === 'finished') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span>Lotes Encerrados com sua Participação ({finishedMyBids.length})</span>
                    </h3>
                  </div>

                  {finishedMyBids.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                      Nenhum lote encerrado com sua participação até o momento.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {finishedMyBids.map((bidItem) => {
                        const visual = getItemVisualBadge(bidItem.itemIconType);
                        const isExpanded = expandedBidItemId === bidItem.itemId;
                        const isWon = bidItem.studentStatus === 'ARREMATADO';

                        return (
                          <div
                            key={bidItem.itemId}
                            className={`rounded-2xl border p-4 sm:p-5 transition-all backdrop-blur-md ${
                              isWon
                                ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-[#121927] shadow-xl'
                                : 'border-slate-800 bg-slate-950/60'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              {/* Left Info */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.bg} border ${visual.border} text-lg shadow-inner`}
                                >
                                  {visual.emoji}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                                      {bidItem.itemCategory}
                                    </span>
                                    {isWon ? (
                                      <span className="text-[11px] font-black text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                        <Trophy className="w-3 h-3 text-slate-950" />
                                        <span>Arrematado por você</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded-full">
                                        Encerrado
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                                    {bidItem.itemTitle}
                                  </h4>

                                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {isWon ? (
                                      <span className="text-emerald-400 font-semibold">
                                        Parabéns! Você venceu a disputa deste lote com o maior lance.
                                      </span>
                                    ) : (
                                      <span>
                                        Vencedor final: <strong className="text-slate-300">{bidItem.highestBidderName}</strong>. Nenhuma Coin sua foi debitada.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Financial Status */}
                              <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                {isWon ? (
                                  <>
                                    <span className="text-[11px] text-slate-400">Lance vencedor:</span>
                                    <span className="font-mono text-base font-black text-amber-300">
                                      {bidItem.winningBid ?? bidItem.studentLastBid} Coins
                                    </span>
                                    {bidItem.spentCoins ? (
                                      <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                                        {bidItem.spentCoins} Coins debitadas definitivamente
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">
                                        Débito registrado no ledger
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[11px] text-slate-400">Seu último lance ofertado:</span>
                                    <span className="font-mono text-sm font-semibold text-slate-300">
                                      {bidItem.studentLastBid} Coins
                                    </span>
                                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                      Reserva liberada &bull; R$ 0 debitado
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Acordeão de histórico */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                              <button
                                onClick={() => setExpandedBidItemId(isExpanded ? null : bidItem.itemId)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Ver seus lances realizados ({bidItem.bidsHistory.length})</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2 text-xs">
                                {bidItem.bidsHistory.map((b, idx) => (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0"
                                  >
                                    <span className="text-slate-300">Lance #{idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-amber-400 font-bold">{b.amount} Coins</span>
                                      <span className="text-[10px] text-slate-500 font-mono">{formatDateTime(b.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: EXTRATO DE COINS (TRANSAÇÕES DEFINITIVAS NO LEDGER) */}
      {/* ============================================================== */}
      {viewMode === 'statement' && (
        <div className="space-y-5">
          {/* Métricas Sintéticas de Apoio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Saldo Atual de Coins
              </span>
              <span className="font-mono text-2xl font-black text-slate-200 mt-1 block">
                {studentCoins.coinBalance.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                saldo definitivo em conta
              </span>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="text-[11px] font-semibold text-amber-300/80 uppercase tracking-wider block">
                Em Lances Ativos
              </span>
              <span className="font-mono text-2xl font-black text-amber-300 mt-1 block">
                {studentCoins.reservedCoins.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-amber-400/60 mt-0.5 block">
                reservadas em disputas
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                Disponível para Lances
              </span>
              <span className="font-mono text-2xl font-black text-emerald-400 mt-1 block">
                {studentCoins.availableCoins.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-emerald-300/70 mt-0.5 block">
                livre para novos lances
              </span>
            </div>
          </div>

          {/* Nota de Transparência Financeira */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Extrato de Movimentações Definitivas:</strong> Este extrato exibe os lançamentos reais que alteram seu saldo de Coins. <strong>Reservas em lances não aparecem aqui</strong> porque continuam sob sua posse até que um lote seja arrematado.
            </div>
          </div>

          {/* Lista de Transações */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Histórico de Lançamentos de Coins</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {coinTransactions.length} registro(s)
              </span>
            </div>

            {coinTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhuma movimentação definitiva de Coins registrada até o momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {coinTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const isSpent = tx.type === 'SPENT';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 text-xs transition-colors hover:border-slate-700 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                            isSpent
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : tx.type === 'EARNED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : tx.type === 'MANUAL'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isSpent ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : tx.type === 'EARNED' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSpent
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                  : tx.type === 'EARNED'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                  : tx.type === 'MANUAL'
                                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {tx.friendlyType}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatDateTime(tx.createdAt)}
                            </span>
                          </div>
                          <span className="text-slate-200 font-medium block truncate mt-1">
                            {tx.description}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`font-mono text-sm font-black ${
                            isPositive
                              ? 'text-emerald-400'
                              : isSpent
                              ? 'text-rose-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {isPositive ? `+${tx.amount.toLocaleString('pt-BR')}` : tx.amount.toLocaleString('pt-BR')}{' '}
                          <span className="text-xs font-sans font-bold">Coins</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODAL DE CONFIRMAÇÃO DE LANCE */}
      {/* ============================================================== */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/40 bg-slate-950 p-6 shadow-2xl shadow-amber-500/10">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Confirmar Lance no Leilão
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{selectedItem.title}</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedItem.description}</p>

            {biddingSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{biddingSuccess}</span>
              </div>
            )}

            {bidError && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{bidError}</span>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Lance atual no item:</span>
                <span className="font-mono font-bold text-white">{selectedItem.currentBid} Coins</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Líder atual:</span>
                <span className="font-semibold text-white">{selectedItem.highestBidder}</span>
              </div>
              <div className="flex items-center justify-between text-amber-400 pt-2 border-t border-slate-800 font-bold">
                <span>Seu saldo disponível para lances:</span>
                <span className="font-mono">{currentBalance} Coins</span>
              </div>
            </div>

            {/* Seletor de Valor do Lance */}
            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-slate-300">Valor do seu novo lance:</label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={selectedItem.minNextBid}
                    max={currentBalance}
                    step={10}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 font-mono text-base font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-500">Coins</span>
                </div>
              </div>

              {/* Sugestões rápidas */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBidAmount(selectedItem.minNextBid)}
                  className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-mono hover:border-slate-700 cursor-pointer"
                >
                  +{selectedItem.minNextBid - selectedItem.currentBid} Coins (Mínimo)
                </button>
                <button
                  type="button"
                  onClick={() => setBidAmount(selectedItem.currentBid + 100)}
                  className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-mono hover:border-slate-700 cursor-pointer"
                >
                  +100 Coins
                </button>
                <button
                  type="button"
                  onClick={() => setBidAmount(selectedItem.currentBid + 250)}
                  className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-mono hover:border-slate-700 cursor-pointer"
                >
                  +250 Coins
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBid}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all active:scale-[0.98] cursor-pointer"
              >
                Confirmar Lance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
