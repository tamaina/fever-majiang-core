type Seats = [number, number, number];

function distributeTsumo(base: number, winner: number, honba: number, deposits: number):
    { defen: number; fenpei: Seats } {
    if (winner !== 0 && winner !== 1 && winner !== 2) {
        throw new RangeError('Invalid sanma winner seat');
    }
    const dealerPayment = Math.ceil(base * 2 / 100) * 100;
    const otherPayment = Math.ceil(base / 100) * 100;
    const defen = dealerPayment + (winner === 0 ? dealerPayment : otherPayment);
    const payout = (seat: 0 | 1 | 2): number => {
        if (seat === winner) return defen + honba * 200 + deposits * 1000;
        return -((winner === 0 || seat === 0 ? dealerPayment : otherPayment) + honba * 100);
    };
    return { defen, fenpei: [payout(0), payout(1), payout(2)] };
}

export = distributeTsumo;
