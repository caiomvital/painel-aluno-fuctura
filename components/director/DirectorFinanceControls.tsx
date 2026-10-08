"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  GraduationCap,
  School,
  Layers,
  Plus,
  Settings,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Zap,
  TrendingUp,
  Sliders,
  Shield,
  BookOpen,
  FileText,
  Gavel,
  Trash2,
  Edit3,
  Search,
  Flame,
  Tag,
  Sparkles,
  X,
  Check,
  Award,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import type { AuctionItem, AuctionGlobalSettings } from "@/lib/auctionStore";
import type { DirectorDashboardData } from "@/lib/academic-service";
import { api, buttonClass, fieldClass } from "./director-ui";

export default function DirectorFinanceControls({
  data,
  onChanged,
}: {
  data: DirectorDashboardData;
  onChanged: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"auction" | "gamification">(
    "auction",
  );
  const [balanceStudent, setBalanceStudent] = useState("");
  const [balanceKind, setBalanceKind] = useState("XP");
  const [balanceValue, setBalanceValue] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const [bids, setBids] = useState<
    {
      id: string;
      amount: number;
      bidderName: string;
      createdAt: string;
      item: { title: string };
    }[]
  >([]);
  // Auction State
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [auctionSettings, setAuctionSettings] =
    useState<AuctionGlobalSettings | null>(null);
  const [loadingAuction, setLoadingAuction] = useState(false);
  const [auctionSearch, setAuctionSearch] = useState("");

  // Modals for Auction
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AuctionItem | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    title: "",
    category: "Equipamento" as
      | "Equipamento"
      | "Mentoria"
      | "Swag Oficial"
      | "Certificação"
      | "Livros",
    description: "",
    marketValue: "R$ 0,00",
    minNextBid: 200,
    iconType: "keyboard" as any,
    isFeatured: false,
    durationHours: 48,
  });

  // Feedback notifications
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(null), 4000);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const loadAuction = async () => {
    setLoadingAuction(true);
    try {
      const json = await api("/api/director/auction");
      setAuctionItems(json.items);
      setAuctionSettings(json.settings);
      setBids(json.bids);
    } catch (error) {
      showNotification((error as Error).message, true);
    } finally {
      setLoadingAuction(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    api("/api/director/auction", undefined, undefined, controller.signal)
      .then((json) => {
        setAuctionItems(json.items);
        setAuctionSettings(json.settings);
        setBids(json.bids);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setActionErrorMsg(error.message);
      });
    return () => controller.abort();
  }, []);
  const adjustBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingBalance(true);
    try {
      if (balanceKind === "XP")
        await api("/api/director/students", "PUT", {
          id: balanceStudent,
          currentXp: Number(balanceValue),
        });
      else
        await api("/api/director/coins", "POST", {
          studentId: balanceStudent,
          amount: Number(balanceValue),
          description: balanceReason,
        });
      await onChanged();
      showNotification("Ajuste registrado no ledger.");
    } catch (error) {
      showNotification((error as Error).message, true);
    } finally {
      setSavingBalance(false);
    }
  };
  // ================= AUCTION ACTIONS =================
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      title: "",
      category: "Equipamento",
      description: "",
      marketValue: "R$ 350,00",
      minNextBid: 300,
      iconType: "keyboard",
      isFeatured: false,
      durationHours: 48,
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: AuctionItem) => {
    setEditingItem(item);
    setItemFormData({
      title: item.title,
      category: item.category,
      description: item.description,
      marketValue: item.marketValue,
      minNextBid: item.minNextBid,
      iconType: item.iconType,
      isFeatured: !!item.isFeatured,
      durationHours: Math.round(item.endsInSeconds / 3600) || 24,
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update
        const res = await fetch("/api/director/auction", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            title: itemFormData.title,
            category: itemFormData.category,
            description: itemFormData.description,
            marketValue: itemFormData.marketValue,
            minNextBid: Number(itemFormData.minNextBid),
            iconType: itemFormData.iconType,
            isFeatured: itemFormData.isFeatured,
            endsInSeconds: itemFormData.durationHours * 3600,
          }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar item.");
        showNotification("Item do leilão atualizado com sucesso!");
      } else {
        // Create
        const res = await fetch("/api/director/auction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: itemFormData.title,
            category: itemFormData.category,
            description: itemFormData.description,
            marketValue: itemFormData.marketValue,
            minNextBid: Number(itemFormData.minNextBid),
            iconType: itemFormData.iconType,
            isFeatured: itemFormData.isFeatured,
            endsInSeconds: itemFormData.durationHours * 3600,
          }),
        });
        if (!res.ok) throw new Error("Falha ao criar item no leilão.");
        showNotification("Novo item incluído no leilão com sucesso!");
      }
      setShowItemModal(false);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar item.", true);
    }
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja remover o item "${title}" do leilão?`))
      return;
    try {
      const res = await fetch(`/api/director/auction?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao remover item.");
      showNotification(`Item "${title}" removido com sucesso.`);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || "Erro ao remover item.", true);
    }
  };

  const handleSaveAuctionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionSettings) return;
    try {
      const res = await fetch("/api/director/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTINGS",
          seasonTitle: auctionSettings.seasonTitle,
          status: auctionSettings.status,
          endDate: auctionSettings.endDate,
          minBidIncrement: auctionSettings.minBidIncrement,
        }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar configurações.");
      showNotification(
        "Configurações e datas do leilão atualizadas com sucesso!",
      );
      setShowSettingsModal(false);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar configurações.", true);
    }
  };

  const filteredAuctionItems = auctionItems.filter(
    (i) =>
      i.title.toLowerCase().includes(auctionSearch.toLowerCase()) ||
      i.category.toLowerCase().includes(auctionSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {actionSuccessMsg && (
        <p role="status" className="text-emerald-300">
          {actionSuccessMsg}
        </p>
      )}
      {actionErrorMsg && (
        <div role="alert" className="text-rose-300">
          {actionErrorMsg}
          <button className={buttonClass} onClick={loadAuction}>
            Tentar carregar leilão novamente
          </button>
        </div>
      )}
      {bids.length > 0 && (
        <section className="rounded-2xl border border-slate-800 p-4 space-y-2">
          <h2 className="font-bold">Últimos lances</h2>
          {bids.map((b) => (
            <p className="text-sm" key={b.id}>
              {b.bidderName} • {b.item.title} • {b.amount} Coins •{" "}
              {new Date(b.createdAt).toLocaleString("pt-BR")}
            </p>
          ))}
        </section>
      )}
      {loadingAuction && <p role="status">Carregando leilão…</p>}
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} onClick={() => setActiveTab("auction")}>
          Leilões
        </button>
        <button
          className={buttonClass}
          onClick={() => setActiveTab("gamification")}
        >
          Regras de XP
        </button>
      </div>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h2 className="font-bold">Ajustes manuais de XP e Coins</h2>
        <form onSubmit={adjustBalance} className="grid gap-3 sm:grid-cols-2">
          <label>
            Aluno para ajuste
            <select
              className={fieldClass}
              required
              value={balanceStudent}
              onChange={(e) => setBalanceStudent(e.target.value)}
            >
              <option value="">Selecione</option>
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.currentXp} XP / {s.coinBalance} Coins (
                  {s.reservedCoins} reservados)
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de ajuste
            <select
              className={fieldClass}
              value={balanceKind}
              onChange={(e) => setBalanceKind(e.target.value)}
            >
              <option>XP</option>
              <option>Coins</option>
            </select>
          </label>
          <label>
            {balanceKind === "XP" ? "Novo total de XP" : "Variação de Coins"}
            <input
              className={fieldClass}
              type="number"
              step="1"
              min={balanceKind === "XP" ? 0 : undefined}
              required
              value={balanceValue}
              onChange={(e) => setBalanceValue(e.target.value)}
            />
          </label>
          {balanceKind === "Coins" && (
            <label>
              Descrição do ajuste
              <input
                className={fieldClass}
                required
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
              />
            </label>
          )}
          <button className={buttonClass} disabled={savingBalance}>
            Registrar ajuste
          </button>
        </form>
      </section>
      {activeTab === "auction" && (
        <div className="space-y-6">
          {/* Banner de Controle da Temporada & Datas do Leilão */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-900 p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Status do Leilão Oficial
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {auctionSettings?.seasonTitle ?? "Sem temporada cadastrada"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Status atual:{" "}
                  <strong className="text-emerald-400 uppercase font-black">
                    {auctionSettings
                      ? auctionSettings.status === "ACTIVE"
                        ? "Ativo (Disputa Aberta)"
                        : "Pausado / Encerrado"
                      : "Sem temporada"}
                  </strong>
                </span>
                <span>&bull;</span>
                <span>
                  Incremento Mínimo por Lance:{" "}
                  <strong>
                    {auctionSettings?.minBidIncrement ?? "—"} Coins
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                disabled={!auctionSettings}
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Configurar Datas &amp; Status</span>
              </button>

              <button
                disabled={!auctionSettings}
                onClick={handleOpenCreateItem}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Incluir Novo Item no Leilão</span>
              </button>
            </div>
          </div>

          {/* Search & Counter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por prêmio ou categoria..."
                value={auctionSearch}
                onChange={(e) => setAuctionSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              Exibindo <strong>{filteredAuctionItems.length}</strong> de{" "}
              <strong>{auctionItems.length}</strong> lotes disponíveis
            </span>
          </div>

          {/* Grid de Itens do Leilão */}
          {filteredAuctionItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">
                Nenhum lote encontrado
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Não há itens correspondentes aos termos filtrados ou ainda não
                há lotes cadastrados.
              </p>
              <button
                disabled={!auctionSettings}
                onClick={handleOpenCreateItem}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Lote</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuctionItems.map((item) => (
                <div
                  key={item.id}
                  data-testid={`auction-${item.id}`}
                  className={`rounded-3xl border p-5 flex flex-col justify-between backdrop-blur-md shadow-xl transition-all hover:border-slate-700 ${
                    item.isFeatured
                      ? "border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-slate-900/80 to-slate-950"
                      : "border-slate-800/80 bg-slate-900/60"
                  }`}
                >
                  <div>
                    {/* Top Row: Category + Actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          {item.category}
                        </span>
                        {item.isFeatured && (
                          <span className="text-[9px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                            ⭐ Destaque
                          </span>
                        )}
                      </div>

                      {/* Admin Actions: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:border-amber-400/50 hover:bg-amber-500/10 transition-colors"
                          title="Editar item do leilão"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="p-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                          title="Remover do leilão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Maior Lance Atual
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 font-mono font-bold text-sm">
                          <Zap className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{item.currentBid} Coins</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">
                          Valor Comercial
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {item.marketValue}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/60">
                      <span>
                        Licitante:{" "}
                        <strong className="text-slate-200">
                          {item.highestBidder}
                        </strong>
                      </span>
                      <span className="font-mono text-cyan-400">
                        {item.totalBids} lances
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Lote / Datas</span>
                      </button>
                      <button
                        className={buttonClass}
                        disabled={item.status === "FINISHED"}
                        onClick={async () => {
                          if (!confirm(`Encerrar o lote "${item.title}"?`))
                            return;
                          try {
                            await api("/api/director/auction", "POST", {
                              action: "CLOSE_ITEM",
                              itemId: item.id,
                            });
                            await loadAuction();
                            await onChanged();
                            showNotification("Lote encerrado.");
                          } catch (e) {
                            showNotification((e as Error).message, true);
                          }
                        }}
                      >
                        Encerrar lote
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "gamification" && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Valores de Recompensa em XP</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte as regras de recompensa atualmente cadastradas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(data.gamificationRules || []).map((rule: any) => (
              <div
                key={rule.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2"
              >
                <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {rule.code}
                </span>
                <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {rule.description}
                </p>
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">XP Concedido:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    +{rule.xpValue} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              editingItem
                ? "Editar Lote do Leilão"
                : "Incluir Novo Item no Leilão"
            }
            className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingItem
                    ? "Editar Lote do Leilão"
                    : "Incluir Novo Item no Leilão"}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título do Prêmio / Lote
                </label>
                <input
                  aria-label="Título do Prêmio / Lote"
                  type="text"
                  required
                  placeholder="Ex: Teclado Mecânico Keychron K2 RGB"
                  value={itemFormData.title}
                  onChange={(e) =>
                    setItemFormData({ ...itemFormData, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Categoria
                  </label>
                  <select
                    aria-label="Categoria"
                    value={itemFormData.category}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Equipamento">Equipamento</option>
                    <option value="Mentoria">Mentoria</option>
                    <option value="Swag Oficial">Swag Oficial</option>
                    <option value="Certificação">Certificação</option>
                    <option value="Livros">Livros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Valor Comercial (R$)
                  </label>
                  <input
                    aria-label="Valor Comercial (R$)"
                    type="text"
                    required
                    placeholder="Ex: R$ 680,00"
                    value={itemFormData.marketValue}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        marketValue: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Lance Mínimo Inicial (Coins)
                  </label>
                  <input
                    aria-label="Lance Mínimo Inicial (Coins)"
                    disabled={Boolean(editingItem)}
                    type="number"
                    required
                    min={50}
                    step={10}
                    value={itemFormData.minNextBid}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        minNextBid: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Duração do Leilão (Horas)
                  </label>
                  <input
                    aria-label="Duração do Leilão (Horas)"
                    type="number"
                    required
                    min={1}
                    value={itemFormData.durationHours}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        durationHours: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição Detalhada do Item
                </label>
                <textarea
                  aria-label="Descrição Detalhada do Item"
                  required
                  rows={3}
                  placeholder="Descreva as especificações técnicas, condições de entrega ou agendamento..."
                  value={itemFormData.description}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={itemFormData.isFeatured}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      isFeatured: e.target.checked,
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
                />
                <label
                  htmlFor="featuredCheck"
                  className="text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Destacar este prêmio nos Flashcards do Hero principal
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20"
                >
                  {editingItem ? "Salvar Alterações" : "Cadastrar no Leilão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIGURAÇÃO DE DATAS GLOBAIS DO LEILÃO
         ======================================================== */}
      {showSettingsModal && auctionSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Configurar Datas do Leilão"
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Configurar Datas do Leilão
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAuctionSettings}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título da Temporada
                </label>
                <input
                  aria-label="Título da Temporada"
                  type="text"
                  required
                  value={auctionSettings.seasonTitle}
                  onChange={(e) =>
                    setAuctionSettings({
                      ...auctionSettings,
                      seasonTitle: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Status da Disputa
                </label>
                <select
                  aria-label="Status da Disputa"
                  value={auctionSettings.status}
                  onChange={(e) =>
                    setAuctionSettings({
                      ...auctionSettings,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ACTIVE">
                    Ativo (Permitir lances normalmente)
                  </option>
                  <option value="PAUSED">Pausado temporariamente</option>
                  <option value="FINISHED">Encerrado (Arremates finais)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Data / Hora de Encerramento (ISO)
                </label>
                <input
                  aria-label="Data / Hora de Encerramento (ISO)"
                  type="datetime-local"
                  required
                  value={
                    auctionSettings.endDate
                      ? auctionSettings.endDate.slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setAuctionSettings({
                      ...auctionSettings,
                      endDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ao atingir este horário, o sistema encerra automaticamente os
                  lances.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Incremento Mínimo por Lance (Coins)
                </label>
                <input
                  aria-label="Incremento Mínimo por Lance (Coins)"
                  type="number"
                  required
                  min={10}
                  step={10}
                  value={auctionSettings.minBidIncrement}
                  onChange={(e) =>
                    setAuctionSettings({
                      ...auctionSettings,
                      minBidIncrement: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20"
                >
                  Salvar Datas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
