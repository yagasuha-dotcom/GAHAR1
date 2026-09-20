import { Asset, GameState, NewsItem, Position } from "./types";

export const clamp = (n:number, min:number, max:number) => Math.max(min, Math.min(max,n));

export function regimeFor(tick:number): string {
  const phase = Math.floor(tick / 80) % 7;
  return ["SIDEWAYS","BULL","EUPHORIA","DISTRIBUTION","BEAR","PANIC","RECOVERY"][phase];
}

export function newsForce(asset: Asset, news: NewsItem[]): number {
  return news.filter(n => n.assets.includes(asset.id)).reduce((s,n) => s + n.sentiment*n.impact, 0);
}

export function nextPrice(asset: Asset, state: GameState): number {
  const force = newsForce(asset, state.news);
  const regimeBias: Record<string,number> = {
    BULL:.00055, EUPHORIA:.0011, DISTRIBUTION:-.00035, BEAR:-.00055,
    PANIC:-.0017, RECOVERY:.0007, SIDEWAYS:0
  };
  const cycle = Math.sin((state.tick + asset.id.length*11) / 23) * asset.volatility * 0.00016;
  const deterministicNoise = Math.sin(state.tick*1.73 + asset.id.length*4.7) * asset.volatility * 0.00055;
  const mean = asset.history.length > 20
    ? ((asset.history[asset.history.length-20].c - asset.price) / asset.price) * .08
    : 0;
  const ret = regimeBias[state.regime] + asset.trend*.00028 + force*.00035 + cycle + deterministicNoise + mean;
  return Math.max(0.0001, asset.price * (1 + ret));
}

export function unrealized(position: Position, price:number): number {
  const direction = position.side === "LONG" ? 1 : -1;
  return (price - position.entry) * position.size * direction;
}

export function totalUnrealized(assets: Asset[], positions: Position[]): number {
  return positions.reduce((s,p) => {
    const a = assets.find(x=>x.id===p.assetId);
    return s + (a ? unrealized(p,a.price) : 0);
  },0);
}

export function formatMoney(n:number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return "$" + n.toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}

export function formatPrice(n:number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n >= 1000 ? n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) :
    n >= 10 ? n.toFixed(2) : n.toFixed(4);
}

export function positionMargin(p:Position): number {
  return Math.abs(p.entry*p.size)/Math.max(1,p.leverage);
}
