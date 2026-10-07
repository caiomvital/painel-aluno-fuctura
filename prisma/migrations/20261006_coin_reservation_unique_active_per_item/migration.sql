-- CreateIndex: Garante estruturalmente no PostgreSQL que no máximo uma CoinReservation tenha status ACTIVE por lote
CREATE UNIQUE INDEX "CoinReservation_itemId_active_unique" ON "CoinReservation"("itemId") WHERE status = 'ACTIVE';
