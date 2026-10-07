// lib/auctionStore.ts
// Centralized store for Auction items and global auction settings
// Synchronizes changes made by the Director with the Student and Teacher views

export interface AuctionItem {
  id: string;
  title: string;
  category: 'Equipamento' | 'Mentoria' | 'Swag Oficial' | 'Certificação' | 'Livros';
  description: string;
  imageUrl?: string;
  iconType: 'keyboard' | 'mentorship' | 'swag' | 'book' | 'cert' | 'headphone';
  currentBid: number;
  minNextBid: number;
  highestBidder: string;
  isMyHighestBid?: boolean;
  totalBids: number;
  endsInSeconds: number; // Seconds from now or countdown
  marketValue: string;
  isFeatured?: boolean;
  endDate?: string; // ISO date string for custom end date
  status?: 'ACTIVE' | 'PAUSED' | 'FINISHED';
}

export interface AuctionGlobalSettings {
  seasonTitle: string;
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  endDate: string; // ISO string
  minBidIncrement: number; // e.g. 50 XP
}

const DEFAULT_GLOBAL_SETTINGS: AuctionGlobalSettings = {
  seasonTitle: 'Temporada Oficial Fuctura Tech 2026.1',
  status: 'ACTIVE',
  endDate: new Date(Date.now() + 1000 * 60 * 60 * 28 + 1000 * 60 * 20).toISOString(), // ~1 day 4 hours
  minBidIncrement: 50,
};

const DEFAULT_ITEMS: AuctionItem[] = [
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
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 680,00',
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    id: 'auc_2',
    title: 'Mentoria Individual 1-on-1 com CTO Parceiro (2h)',
    category: 'Mentoria',
    description: 'Code review detalhado do seu GitHub, preparação para entrevistas técnicas sênior e direcionamento de carreira.',
    iconType: 'mentorship',
    currentBid: 1100,
    minNextBid: 1150,
    highestBidder: 'João Pedro da Silva', // Aluno logado liderando
    isMyHighestBid: true,
    totalBids: 19,
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 950,00',
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    id: 'auc_3',
    title: 'Moletom Exclusivo Fuctura Dev Edition (Preto/Ciano)',
    category: 'Swag Oficial',
    description: 'Tecido premium 100% algodão, capuz forrado, bolso canguru e bordado de alta definição Fuctura Software School.',
    iconType: 'swag',
    currentBid: 520,
    minNextBid: 550,
    highestBidder: 'Mariana Costa',
    isMyHighestBid: false,
    totalBids: 9,
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 220,00',
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    id: 'auc_4',
    title: 'Voucher 100% Pago Certificação Oracle Java ou LPI-1',
    category: 'Certificação',
    description: 'Exame oficial internacional com direito a retake. Agendamento presencial no centro autorizado de Recife ou remoto.',
    iconType: 'cert',
    currentBid: 1750,
    minNextBid: 1800,
    highestBidder: 'Gabriel Souza',
    isMyHighestBid: false,
    totalBids: 26,
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 1.450,00',
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    id: 'auc_5',
    title: 'Kit Livros Técnicos: Clean Code + Microsserviços Práticos',
    category: 'Livros',
    description: 'Edições físicas em capa dura dos clássicos da engenharia de software essenciais para programadores plenos.',
    iconType: 'book',
    currentBid: 410,
    minNextBid: 450,
    highestBidder: 'Rafael Lima',
    isMyHighestBid: false,
    totalBids: 7,
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 290,00',
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    id: 'auc_6',
    title: 'Headset Gamer ANC Anker Soundcore Q30 Hi-Res',
    category: 'Equipamento',
    description: 'Cancelamento ativo de ruído híbrido, drivers de 40mm, bateria de 40 horas e microfones para chamadas nítidas.',
    iconType: 'headphone',
    currentBid: 680,
    minNextBid: 720,
    highestBidder: 'Beatriz Martins',
    isMyHighestBid: false,
    totalBids: 11,
    endsInSeconds: 3600 * 28 + 1200,
    marketValue: 'R$ 450,00',
    isFeatured: false,
    status: 'ACTIVE',
  },
];

interface AuctionStoreSingleton {
  items: AuctionItem[];
  settings: AuctionGlobalSettings;
}

const globalForAuction = globalThis as unknown as { fucturaAuctionStore?: AuctionStoreSingleton };

function getStore(): AuctionStoreSingleton {
  if (!globalForAuction.fucturaAuctionStore) {
    globalForAuction.fucturaAuctionStore = {
      items: [...DEFAULT_ITEMS],
      settings: { ...DEFAULT_GLOBAL_SETTINGS },
    };
  }
  return globalForAuction.fucturaAuctionStore;
}

export function getAuctionItems(): AuctionItem[] {
  return getStore().items;
}

export function getAuctionSettings(): AuctionGlobalSettings {
  return getStore().settings;
}

export function updateAuctionSettings(partial: Partial<AuctionGlobalSettings>): AuctionGlobalSettings {
  const store = getStore();
  store.settings = { ...store.settings, ...partial };
  return store.settings;
}

export function createAuctionItem(item: Omit<AuctionItem, 'id' | 'currentBid' | 'totalBids' | 'highestBidder'> & { initialBid?: number }): AuctionItem {
  const store = getStore();
  const newItem: AuctionItem = {
    ...item,
    id: `auc_${Date.now()}`,
    currentBid: item.initialBid || item.minNextBid || 100,
    minNextBid: (item.initialBid || item.minNextBid || 100) + store.settings.minBidIncrement,
    highestBidder: 'Sem lances',
    totalBids: 0,
    endsInSeconds: item.endsInSeconds || 3600 * 48,
    status: item.status || 'ACTIVE',
  };
  store.items.unshift(newItem);
  return newItem;
}

export function updateAuctionItem(id: string, partial: Partial<AuctionItem>): AuctionItem | null {
  const store = getStore();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  store.items[idx] = { ...store.items[idx], ...partial };
  return store.items[idx];
}

export function deleteAuctionItem(id: string): boolean {
  const store = getStore();
  const initialLen = store.items.length;
  store.items = store.items.filter((i) => i.id !== id);
  return store.items.length < initialLen;
}

export function placeAuctionBid(itemId: string, bidderName: string, amount: number): { success: boolean; item?: AuctionItem; error?: string } {
  const store = getStore();
  const item = store.items.find((i) => i.id === itemId);
  if (!item) return { success: false, error: 'Item não encontrado.' };

  if (store.settings.status !== 'ACTIVE') {
    return { success: false, error: 'O leilão está pausado ou encerrado pela Diretoria.' };
  }

  if (amount < item.minNextBid) {
    return { success: false, error: `O lance mínimo deve ser de pelo menos ${item.minNextBid} XP.` };
  }

  item.currentBid = amount;
  item.minNextBid = amount + store.settings.minBidIncrement;
  item.highestBidder = bidderName;
  item.isMyHighestBid = true;
  item.totalBids += 1;

  return { success: true, item };
}
