// lib/auction-service.ts
import { prisma } from '@/lib/prisma';
import { AuctionStatus, ReservationStatus, CoinTransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface StudentCoinSummary {
  coinBalance: number;
  reservedCoins: number;
  availableCoins: number;
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
  itemStatus: AuctionStatus;
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
  type: CoinTransactionType;
  friendlyType: string;
  amount: number;
  description: string;
  createdAt: string;
}

// ==========================================
// 1. BASELINE E SEED INICIAL DO LEILÃO (FASE 10 & 16)
// ==========================================

export async function reconcileCoinsBaseline(): Promise<{
  created: Array<{ studentId: string; baselineAmount: number }>;
  skipped: string[];
}> {
  const students = await prisma.student.findMany({ orderBy: { id: 'asc' } });
  const created: Array<{ studentId: string; baselineAmount: number }> = [];
  const skipped: string[] = [];

  for (const student of students) {
    const originRef = `INITIAL_COIN_BASELINE_${student.id}`;

    const existingTx = await prisma.coinTransaction.findFirst({
      where: {
        studentId: student.id,
        originReference: {
          in: [`INITIAL_COIN_BASELINE_${student.id}`, `INITIAL_COIN_BALANCE_${student.id}`],
        },
      },
    });

    if (existingTx) {
      skipped.push(student.id);
      continue;
    }

    // Baseline: coinBalance inicial = currentXp atual
    const initialAmount = student.currentXp;

    await prisma.$transaction(async (tx) => {
      await tx.coinTransaction.create({
        data: {
          studentId: student.id,
          type: CoinTransactionType.BASELINE,
          amount: initialAmount,
          description: 'Saldo inicial de Coins na implantação do sistema',
          originReference: originRef,
        },
      });

      await tx.student.update({
        where: { id: student.id },
        data: {
          coinBalance: initialAmount,
        },
      });
    });

    created.push({ studentId: student.id, baselineAmount: initialAmount });
  }

  return { created, skipped };
}

export async function seedInitialAuctionData() {
  // 1. Reconciliar baseline de Coins de todos os alunos existentes
  await reconcileCoinsBaseline();

  // 2. Temporada oficial
  const seasonEndDate = new Date(Date.now() + 1000 * 60 * 60 * 28 + 1000 * 60 * 20); // ~28 horas
  const season = await prisma.auctionSeason.upsert({
    where: { id: 'season_fuctura_2026_1' },
    update: {
      title: 'Temporada Oficial Fuctura Tech 2026.1',
      status: AuctionStatus.ACTIVE,
      minBidIncrement: 50,
      endsAt: seasonEndDate,
    },
    create: {
      id: 'season_fuctura_2026_1',
      title: 'Temporada Oficial Fuctura Tech 2026.1',
      description: 'Leilão oficial da Fuctura Tecnologia com resgate de prêmios exclusivos através de Coins conquistadas em aula.',
      status: AuctionStatus.ACTIVE,
      minBidIncrement: 50,
      startsAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      endsAt: seasonEndDate,
    },
  });

  // 3. Lotes padrão de demonstração
  const defaultItems = [
    {
      id: 'auc_1',
      title: 'Teclado Mecânico Keychron K2 RGB Wireless',
      category: 'Equipamento',
      description: 'Switches Gateron Brown táteis, layout 75%, corpo em alumínio e conexão Bluetooth/USB-C.',
      iconType: 'keyboard',
      startingBid: 800,
      currentBid: 850,
      minNextBid: 900,
      highestBidderName: 'Lucas Andrade',
      highestBidderId: 'stud_2',
      totalBids: 14,
      marketValue: 'R$ 680,00',
      isFeatured: true,
      endsAt: seasonEndDate,
    },
    {
      id: 'auc_2',
      title: 'Mentoria Individual 1-on-1 com CTO Parceiro (2h)',
      category: 'Mentoria',
      description: 'Code review detalhado do seu GitHub, preparação para entrevistas técnicas sênior e direcionamento de carreira.',
      iconType: 'mentorship',
      startingBid: 1000,
      currentBid: 1100,
      minNextBid: 1150,
      highestBidderName: 'João Pedro da Silva',
      highestBidderId: 'stud_1',
      totalBids: 19,
      marketValue: 'R$ 950,00',
      isFeatured: true,
      endsAt: seasonEndDate,
    },
    {
      id: 'auc_3',
      title: 'Moletom Exclusivo Fuctura Dev Edition (Preto/Ciano)',
      category: 'Swag Oficial',
      description: 'Tecido premium 100% algodão, capuz forrado, bolso canguru e bordado de alta definição Fuctura Software School.',
      iconType: 'swag',
      startingBid: 450,
      currentBid: 520,
      minNextBid: 570,
      highestBidderName: 'Mariana Costa',
      highestBidderId: 'stud_5',
      totalBids: 9,
      marketValue: 'R$ 220,00',
      isFeatured: false,
      endsAt: seasonEndDate,
    },
    {
      id: 'auc_4',
      title: 'Voucher 100% Pago Certificação Oracle Java ou LPI-1',
      category: 'Certificação',
      description: 'Exame oficial internacional com direito a retake. Agendamento presencial no centro autorizado de Recife ou remoto.',
      iconType: 'cert',
      startingBid: 1500,
      currentBid: 1500,
      minNextBid: 1500,
      highestBidderName: 'Sem lances',
      highestBidderId: null,
      totalBids: 0,
      marketValue: 'R$ 1.450,00',
      isFeatured: true,
      endsAt: seasonEndDate,
    },
    {
      id: 'auc_5',
      title: 'Kit Livros Técnicos: Clean Code + Microsserviços Práticos',
      category: 'Livros',
      description: 'Edições físicas em capa dura dos clássicos da engenharia de software essenciais para programadores plenos.',
      iconType: 'book',
      startingBid: 350,
      currentBid: 410,
      minNextBid: 460,
      highestBidderName: 'Rodrigo Oliveira',
      highestBidderId: 'stud_6',
      totalBids: 7,
      marketValue: 'R$ 290,00',
      isFeatured: false,
      endsAt: seasonEndDate,
    },
    {
      id: 'auc_6',
      title: 'Headset Gamer ANC Anker Soundcore Q30 Hi-Res',
      category: 'Equipamento',
      description: 'Cancelamento ativo de ruído híbrido, drivers de 40mm, bateria de 40 horas e microfones para chamadas nítidas.',
      iconType: 'headphone',
      startingBid: 600,
      currentBid: 680,
      minNextBid: 730,
      highestBidderName: 'Beatriz Lima',
      highestBidderId: 'stud_3',
      totalBids: 11,
      marketValue: 'R$ 450,00',
      isFeatured: false,
      endsAt: seasonEndDate,
    },
  ];

  for (const item of defaultItems) {
    const upserted = await prisma.auctionItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        category: item.category,
        description: item.description,
        iconType: item.iconType,
        marketValue: item.marketValue,
        isFeatured: item.isFeatured,
        endsAt: item.endsAt,
      },
      create: {
        id: item.id,
        seasonId: season.id,
        title: item.title,
        category: item.category,
        description: item.description,
        iconType: item.iconType,
        startingBid: item.startingBid,
        currentBid: item.currentBid,
        minNextBid: item.minNextBid,
        marketValue: item.marketValue,
        isFeatured: item.isFeatured,
        highestBidderId: item.highestBidderId,
        highestBidderName: item.highestBidderName,
        totalBids: item.totalBids,
        status: AuctionStatus.ACTIVE,
        startsAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        endsAt: item.endsAt,
      },
    });

    // Criar reserva ativa inicial se o lote tiver highestBidder e ainda não possuir reserva
    if (item.highestBidderId && item.currentBid > 0) {
      const existingRes = await prisma.coinReservation.findFirst({
        where: {
          itemId: upserted.id,
          status: ReservationStatus.ACTIVE,
        },
      });

      if (!existingRes) {
        await prisma.coinReservation.create({
          data: {
            itemId: upserted.id,
            studentId: item.highestBidderId,
            amount: item.currentBid,
            status: ReservationStatus.ACTIVE,
          },
        });
      }

      const existingBid = await prisma.auctionBid.findFirst({
        where: {
          itemId: upserted.id,
          studentId: item.highestBidderId,
        },
      });

      if (!existingBid) {
        await prisma.auctionBid.create({
          data: {
            itemId: upserted.id,
            studentId: item.highestBidderId,
            amount: item.currentBid,
            bidderName: item.highestBidderName || 'Aluno Fuctura',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          },
        });
      }
    }
  }
}

// ==========================================
// 2. CÁLCULO E CONSULTA DE COINS DO ALUNO (FASE 4 & 18)
// ==========================================

export async function getStudentCoinsSummary(studentId: string): Promise<StudentCoinSummary> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { coinBalance: true },
  });

  if (!student) {
    return { coinBalance: 0, reservedCoins: 0, availableCoins: 0 };
  }

  const activeReservations = await prisma.coinReservation.findMany({
    where: {
      studentId,
      status: ReservationStatus.ACTIVE,
    },
  });

  const reservedCoins = activeReservations.reduce((sum, r) => sum + r.amount, 0);
  const availableCoins = Math.max(0, student.coinBalance - reservedCoins);

  return {
    coinBalance: student.coinBalance,
    reservedCoins,
    availableCoins,
  };
}

// ==========================================
// 3. EXPIRAÇÃO LAZY SERVER-SIDE (FASE 9)
// ==========================================

export async function reconcileExpiredAuctionItems(): Promise<number> {
  const now = new Date();
  const expiredItems = await prisma.auctionItem.findMany({
    where: {
      status: AuctionStatus.ACTIVE,
      endsAt: { lte: now },
    },
  });

  let closedCount = 0;
  for (const item of expiredItems) {
    await closeAuctionItem(item.id);
    closedCount++;
  }
  return closedCount;
}

// ==========================================
// 4. CONSULTA PÚBLICA DO LEILÃO (FASE 17 & 18)
// ==========================================

export async function getAuctionOverview(studentId?: string) {
  // 1. Fechar lotes expirados de forma lazy
  await reconcileExpiredAuctionItems();

  // 2. Temporada ativa
  let season = await prisma.auctionSeason.findFirst({
    where: { status: AuctionStatus.ACTIVE },
    orderBy: { createdAt: 'desc' },
  });

  if (!season) {
    season = await prisma.auctionSeason.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  const itemsCount = await prisma.auctionItem.count();
  if (!season || itemsCount === 0) {
    await seedInitialAuctionData();
    season = await prisma.auctionSeason.findFirst({
      where: { status: AuctionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Itens do leilão
  const items = await prisma.auctionItem.findMany({
    where: season ? { seasonId: season.id } : undefined,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'asc' }],
    include: {
      highestBidder: {
        include: { user: true },
      },
    },
  });

  const now = Date.now();
  const formattedItems = items.map((item) => {
    const endsInSeconds = Math.max(0, Math.floor((item.endsAt.getTime() - now) / 1000));
    const isMyHighestBid = Boolean(studentId && item.highestBidderId === studentId);
    const bidderDisplayName = item.highestBidder?.user
      ? item.highestBidder.user.name
      : item.highestBidderName || 'Sem lances';

    return {
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      imageUrl: item.imageUrl,
      iconType: item.iconType,
      currentBid: item.currentBid,
      minNextBid: item.minNextBid,
      highestBidder: isMyHighestBid ? `${bidderDisplayName} (Você)` : bidderDisplayName,
      isMyHighestBid,
      totalBids: item.totalBids,
      endsInSeconds,
      marketValue: item.marketValue,
      isFeatured: item.isFeatured,
      status: item.status,
      endDate: item.endsAt.toISOString(),
    };
  });

  const settings = season
    ? {
        seasonTitle: season.title,
        status: season.status,
        endDate: season.endsAt.toISOString(),
        minBidIncrement: season.minBidIncrement,
      }
    : {
        seasonTitle: 'Leilão Fuctura',
        status: 'PAUSED',
        endDate: new Date().toISOString(),
        minBidIncrement: 50,
      };

  let studentCoins: StudentCoinSummary = { coinBalance: 0, reservedCoins: 0, availableCoins: 0 };
  let myBids: StudentAuctionItemBidSummary[] = [];
  let coinTransactions: StudentCoinTransactionItem[] = [];

  if (studentId) {
    studentCoins = await getStudentCoinsSummary(studentId);
    myBids = await getStudentAuctionBids(studentId);
    coinTransactions = await getStudentCoinTransactions(studentId);
  }

  return {
    items: formattedItems,
    settings,
    studentCoins,
    myBids,
    coinTransactions,
  };
}

// ==========================================
// 4.1. MEUS LANCES & EXTRATO DE COINS (MARCO PÓS-LANCE)
// ==========================================

export async function getStudentAuctionBids(studentId: string): Promise<StudentAuctionItemBidSummary[]> {
  const studentBids = await prisma.auctionBid.findMany({
    where: { studentId },
    orderBy: { createdAt: 'asc' },
  });

  if (!studentBids || studentBids.length === 0) {
    return [];
  }

  const itemIds = Array.from(new Set(studentBids.map((b) => b.itemId)));

  const items = await prisma.auctionItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      highestBidder: {
        include: { user: true },
      },
      reservations: {
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
  });

  const spentTransactions = await prisma.coinTransaction.findMany({
    where: {
      studentId,
      type: CoinTransactionType.SPENT,
      originReference: { in: itemIds.map((id) => `AUCTION_WIN_${id}`) },
    },
  });

  return items.map((item) => {
    const myBidsForItem = studentBids.filter((b) => b.itemId === item.id);
    const lastBid = myBidsForItem[myBidsForItem.length - 1];

    const activeReservation = item.reservations.find(
      (r) => r.status === ReservationStatus.ACTIVE
    );
    const hasReleasedReservation = item.reservations.some(
      (r) => r.status === ReservationStatus.RELEASED
    );

    const isCurrentUserLeading = Boolean(item.highestBidderId === studentId);

    let studentStatus: StudentItemBidStatus;
    let statusLabel: string;

    if (item.status === 'FINISHED') {
      if (item.highestBidderId === studentId) {
        studentStatus = 'ARREMATADO';
        statusLabel = 'Arrematado por você';
      } else {
        studentStatus = 'ENCERRADO';
        statusLabel = 'Encerrado';
      }
    } else {
      if (item.highestBidderId === studentId && activeReservation) {
        studentStatus = 'LIDERANDO';
        statusLabel = 'Você está liderando';
      } else {
        studentStatus = 'SUPERADO';
        statusLabel = 'Seu lance foi superado';
      }
    }

    let spentCoins: number | undefined = undefined;
    if (studentStatus === 'ARREMATADO') {
      const spentTx = spentTransactions.find(
        (tx) => tx.originReference === `AUCTION_WIN_${item.id}`
      );
      if (spentTx) {
        spentCoins = Math.abs(spentTx.amount);
      }
    }

    const bidderDisplayName = item.highestBidder?.user
      ? item.highestBidder.user.name
      : item.highestBidderName || 'Sem lances';

    const bidsHistory: StudentBidHistoryEntry[] = myBidsForItem.map((b) => ({
      id: b.id,
      amount: b.amount,
      createdAt: b.createdAt.toISOString(),
    }));

    return {
      itemId: item.id,
      itemTitle: item.title,
      itemCategory: item.category,
      itemDescription: item.description,
      itemIconType: item.iconType,
      itemStatus: item.status,
      itemCurrentBid: item.currentBid,
      highestBidderId: item.highestBidderId,
      highestBidderName: isCurrentUserLeading ? `${bidderDisplayName} (Você)` : bidderDisplayName,
      isCurrentUserLeading,
      studentStatus,
      statusLabel,
      studentLastBid: lastBid.amount,
      studentLastBidAt: lastBid.createdAt.toISOString(),
      reservedCoins: activeReservation ? activeReservation.amount : 0,
      hasReleasedReservation,
      winningBid: item.status === 'FINISHED' ? item.currentBid : undefined,
      spentCoins,
      bidsHistory,
    };
  });
}

export async function getStudentCoinTransactions(studentId: string): Promise<StudentCoinTransactionItem[]> {
  const transactions = await prisma.coinTransaction.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });

  const friendlyTypes: Record<CoinTransactionType, string> = {
    BASELINE: 'Saldo inicial',
    EARNED: 'Coins recebidas',
    SPENT: 'Coins utilizadas',
    MANUAL: 'Ajuste',
  };

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    friendlyType: friendlyTypes[tx.type] || 'Movimentação',
    amount: tx.amount,
    description: tx.description,
    createdAt: tx.createdAt.toISOString(),
  }));
}

// ==========================================
// 5. LANCE ATÔMICO COM BLOQUEIO POSTGRESQL (FASE 5, 6, 7)
// ==========================================

export async function placeAuctionBid(
  itemId: string,
  studentId: string,
  amount: number,
  bidderDisplayName?: string
): Promise<{
  success: boolean;
  item?: any;
  studentCoins?: StudentCoinSummary;
  myBids?: StudentAuctionItemBidSummary[];
  error?: string;
}> {
  try {
    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Bloquear linha do lote no PostgreSQL (SELECT ... FOR UPDATE)
      const lockedItems = await tx.$queryRaw<
        Array<{
          id: string;
          seasonId: string;
          title: string;
          status: string;
          endsAt: Date;
          currentBid: number;
          minNextBid: number;
          highestBidderId: string | null;
        }>
      >`
        SELECT id, "seasonId", title, status, "endsAt", "currentBid", "minNextBid", "highestBidderId"
        FROM "AuctionItem"
        WHERE id = ${itemId}
        FOR UPDATE;
      `;

      if (!lockedItems || lockedItems.length === 0) {
        return { success: false, error: 'Item não encontrado no leilão.' };
      }
      const item = lockedItems[0];

      // 2. Verificar encerramento do lote
      const now = new Date();
      if (item.status !== 'ACTIVE' || new Date(item.endsAt).getTime() <= now.getTime()) {
        return { success: false, error: 'Este lote já está encerrado ou pausado para novos lances.' };
      }

      // 3. Obter temporada e minBidIncrement
      const season = await tx.auctionSeason.findUnique({
        where: { id: item.seasonId },
      });
      if (!season || season.status !== 'ACTIVE') {
        return { success: false, error: 'A temporada do leilão não está ativa.' };
      }

      // 4. Validar valor mínimo do lance
      if (amount < item.minNextBid) {
        return {
          success: false,
          error: `O lance mínimo deve ser de pelo menos ${item.minNextBid} Coins.`,
        };
      }

      // 5. Bloquear linha do aluno no PostgreSQL (SELECT ... FOR UPDATE)
      const lockedStudents = await tx.$queryRaw<
        Array<{ id: string; userId: string; coinBalance: number }>
      >`
        SELECT id, "userId", "coinBalance"
        FROM "Student"
        WHERE id = ${studentId}
        FOR UPDATE;
      `;

      if (!lockedStudents || lockedStudents.length === 0) {
        return { success: false, error: 'Aluno não encontrado.' };
      }
      const student = lockedStudents[0];

      // 6. FASE 6 & 7: Calcular saldo disponível considerando reservas em OUTROS lotes
      // Reservas ativas em outros itens não podem ser violadas
      const otherReservations = await tx.coinReservation.findMany({
        where: {
          studentId,
          status: ReservationStatus.ACTIVE,
          itemId: { not: itemId }, // Exclui este lote (se o aluno já liderava aqui, a reserva será substituída, não somada)
        },
      });

      const reservedOnOtherItems = otherReservations.reduce((sum, r) => sum + r.amount, 0);
      const availableForThisBid = student.coinBalance - reservedOnOtherItems;

      if (availableForThisBid < amount) {
        return {
          success: false,
          error: `Saldo insuficiente de Coins. Você possui ${availableForThisBid} Coins disponíveis e o lance é de ${amount} Coins.`,
        };
      }

      // 7. Buscar nome do aluno
      const studentUser = await tx.user.findUnique({
        where: { id: student.userId },
        select: { name: true },
      });
      const resolvedBidderName = bidderDisplayName || studentUser?.name || 'Aluno Fuctura';

      // 8. Persistir histórico do lance (AuctionBid)
      const bid = await tx.auctionBid.create({
        data: {
          itemId,
          studentId,
          amount,
          bidderName: resolvedBidderName,
        },
      });

      // 9. Liberar reserva anterior deste lote (seja de quem for)
      await tx.coinReservation.updateMany({
        where: {
          itemId,
          status: ReservationStatus.ACTIVE,
        },
        data: {
          status: ReservationStatus.RELEASED,
        },
      });

      // 10. Criar a nova reserva ativa para o lance vencedor atual
      await tx.coinReservation.create({
        data: {
          itemId,
          studentId,
          amount,
          status: ReservationStatus.ACTIVE,
        },
      });

      // 11. Atualizar o lote
      const nextMin = amount + season.minBidIncrement;
      const updatedItem = await tx.auctionItem.update({
        where: { id: itemId },
        data: {
          currentBid: amount,
          minNextBid: nextMin,
          highestBidderId: studentId,
          highestBidderName: resolvedBidderName,
          totalBids: { increment: 1 },
        },
      });

      // 12. Recalcular sumário de Coins do aluno pós-lance
      const totalReservedNow = reservedOnOtherItems + amount;
      const finalAvailable = student.coinBalance - totalReservedNow;

      return {
        success: true,
        item: {
          ...updatedItem,
          isMyHighestBid: true,
          highestBidder: `${resolvedBidderName} (Você)`,
          endsInSeconds: Math.max(0, Math.floor((new Date(updatedItem.endsAt).getTime() - Date.now()) / 1000)),
        },
        studentCoins: {
          coinBalance: student.coinBalance,
          reservedCoins: totalReservedNow,
          availableCoins: finalAvailable,
        },
      };
    });

    if (txResult.success) {
      const myBids = await getStudentAuctionBids(studentId);
      return {
        ...txResult,
        myBids,
      };
    }

    return txResult;
  } catch (error: any) {
    console.error('Erro na transação de lance:', error);
    return { success: false, error: error.message || 'Erro interno ao processar lance.' };
  }
}

// ==========================================
// 6. ENCERRAMENTO ATÔMICO E IDEMPOTENTE DO LOTE (FASE 8)
// ==========================================

export async function closeAuctionItem(itemId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Bloquear lote no PostgreSQL
    const lockedItems = await tx.$queryRaw<
      Array<{
        id: string;
        title: string;
        status: string;
        currentBid: number;
        highestBidderId: string | null;
        totalBids: number;
      }>
    >`
      SELECT id, title, status, "currentBid", "highestBidderId", "totalBids"
      FROM "AuctionItem"
      WHERE id = ${itemId}
      FOR UPDATE;
    `;

    if (!lockedItems || lockedItems.length === 0) return null;
    const item = lockedItems[0];

    // FASE 8 IDEMPOTÊNCIA: Se já finalizado, não processar novamente nem debitar
    if (item.status === 'FINISHED') {
      return await tx.auctionItem.findUnique({ where: { id: itemId } });
    }

    const winnerId = item.highestBidderId;

    // Se houve vencedor com lances
    if (winnerId && item.totalBids > 0) {
      const originRef = `AUCTION_WIN_${itemId}`;

      // Verificar se já houve débito deste lote para evitar duplicidade
      const existingDebt = await tx.coinTransaction.findUnique({
        where: {
          studentId_originReference: {
            studentId: winnerId,
            originReference: originRef,
          },
        },
      });

      if (!existingDebt) {
        // Encontrar reserva ativa correspondente
        const activeRes = await tx.coinReservation.findFirst({
          where: {
            itemId,
            studentId: winnerId,
            status: ReservationStatus.ACTIVE,
          },
        });

        if (activeRes) {
          // Converter reserva em CONSUMED
          await tx.coinReservation.update({
            where: { id: activeRes.id },
            data: { status: ReservationStatus.CONSUMED },
          });
        }

        // Criar débito definitivo em CoinTransaction
        await tx.coinTransaction.create({
          data: {
            studentId: winnerId,
            type: CoinTransactionType.SPENT,
            amount: -item.currentBid,
            description: `Arremate no leilão: ${item.title}`,
            originReference: originRef,
          },
        });

        // Decrementar saldo do vencedor
        await tx.student.update({
          where: { id: winnerId },
          data: {
            coinBalance: { decrement: item.currentBid },
          },
        });
      }
    }

    // Liberar quaisquer outras reservas que tenham sobrado
    await tx.coinReservation.updateMany({
      where: {
        itemId,
        status: ReservationStatus.ACTIVE,
      },
      data: {
        status: ReservationStatus.RELEASED,
      },
    });

    // Marcar lote como encerrado
    const finishedItem = await tx.auctionItem.update({
      where: { id: itemId },
      data: {
        status: AuctionStatus.FINISHED,
      },
    });

    return finishedItem;
  });
}

// ==========================================
// 7. OPERAÇÕES ADMINISTRATIVAS DA DIRETORIA (FASE 15 & 17)
// ==========================================

export async function createAuctionItemByDirector(data: {
  title: string;
  category: string;
  description: string;
  marketValue?: string;
  minNextBid?: number;
  iconType?: string;
  isFeatured?: boolean;
  endsInSeconds?: number;
  seasonId?: string;
}) {
  let season = await prisma.auctionSeason.findFirst({
    where: { status: AuctionStatus.ACTIVE },
    orderBy: { createdAt: 'desc' },
  });

  if (!season) {
    season = await prisma.auctionSeason.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  const seasonId = data.seasonId || season?.id || 'season_fuctura_2026_1';
  const minBid = Number(data.minNextBid) || 100;
  const duration = Number(data.endsInSeconds) || 3600 * 48;
  const endsAt = new Date(Date.now() + duration * 1000);

  const newItem = await prisma.auctionItem.create({
    data: {
      seasonId,
      title: data.title.trim(),
      category: data.category.trim(),
      description: data.description.trim(),
      marketValue: data.marketValue || 'R$ 0,00',
      startingBid: minBid,
      currentBid: minBid,
      minNextBid: minBid + (season?.minBidIncrement || 50),
      iconType: data.iconType || 'keyboard',
      isFeatured: Boolean(data.isFeatured),
      highestBidderName: 'Sem lances',
      totalBids: 0,
      status: AuctionStatus.ACTIVE,
      startsAt: new Date(),
      endsAt,
    },
  });

  return {
    ...newItem,
    endsInSeconds: duration,
    highestBidder: 'Sem lances',
    isMyHighestBid: false,
  };
}

export async function updateAuctionItemByDirector(id: string, partial: any) {
  const item = await prisma.auctionItem.findUnique({ where: { id } });
  if (!item) return null;

  let endsAt: Date | undefined;
  if (partial.endsInSeconds) {
    endsAt = new Date(Date.now() + Number(partial.endsInSeconds) * 1000);
  } else if (partial.endDate) {
    endsAt = new Date(partial.endDate);
  }

  const updated = await prisma.auctionItem.update({
    where: { id },
    data: {
      title: partial.title ? partial.title.trim() : undefined,
      category: partial.category ? partial.category.trim() : undefined,
      description: partial.description ? partial.description.trim() : undefined,
      marketValue: partial.marketValue,
      iconType: partial.iconType,
      isFeatured: partial.isFeatured !== undefined ? Boolean(partial.isFeatured) : undefined,
      status: partial.status,
      endsAt,
    },
  });

  return {
    ...updated,
    endsInSeconds: Math.max(0, Math.floor((updated.endsAt.getTime() - Date.now()) / 1000)),
    highestBidder: updated.highestBidderName || 'Sem lances',
    isMyHighestBid: false,
  };
}

export async function deleteAuctionItemByDirector(id: string) {
  const item = await prisma.auctionItem.findUnique({ where: { id } });
  if (!item) return false;

  await prisma.$transaction(async (tx) => {
    // Liberar reservas ativas
    await tx.coinReservation.deleteMany({ where: { itemId: id } });
    await tx.auctionBid.deleteMany({ where: { itemId: id } });
    await tx.auctionItem.delete({ where: { id } });
  });

  return true;
}

export async function updateAuctionSettingsByDirector(settings: {
  seasonTitle?: string;
  status?: AuctionStatus;
  endDate?: string;
  minBidIncrement?: number;
}) {
  let season = await prisma.auctionSeason.findFirst({
    where: { status: AuctionStatus.ACTIVE },
    orderBy: { createdAt: 'desc' },
  });

  if (!season) {
    season = await prisma.auctionSeason.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  if (!season) return null;

  const updated = await prisma.auctionSeason.update({
    where: { id: season.id },
    data: {
      title: settings.seasonTitle ? settings.seasonTitle.trim() : undefined,
      status: settings.status,
      endsAt: settings.endDate ? new Date(settings.endDate) : undefined,
      minBidIncrement: settings.minBidIncrement ? Number(settings.minBidIncrement) : undefined,
    },
  });

  return {
    seasonTitle: updated.title,
    status: updated.status,
    endDate: updated.endsAt.toISOString(),
    minBidIncrement: updated.minBidIncrement,
  };
}

// FASE 15: Ajuste Manual de Coins (independente de XP)
export async function manualAdjustStudentCoins(params: {
  studentId: string;
  amount: number;
  description: string;
  directorUserId?: string;
}) {
  const { studentId, amount, description, directorUserId } = params;

  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('Aluno não encontrado.');

    if (amount < 0 && student.coinBalance + amount < 0) {
      throw new Error(`Saldo insuficiente de Coins para débito manual. Saldo atual: ${student.coinBalance}.`);
    }

    const originRef = `MANUAL_COINS_${randomUUID()}`;

    const txRecord = await tx.coinTransaction.create({
      data: {
        studentId,
        type: CoinTransactionType.MANUAL,
        amount,
        description: description || `Ajuste manual de Coins pela Diretoria (${amount >= 0 ? '+' : ''}${amount} Coins)`,
        originReference: originRef,
      },
    });

    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        coinBalance: { increment: amount },
      },
    });

    return {
      student: updatedStudent,
      transaction: txRecord,
    };
  });
}
