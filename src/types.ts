export type AssetType = "CRYPTO" | "FOREX" | "STOCK" | "COMMODITY" | "INDEX";
export type Side = "LONG" | "SHORT";
export type Page = "markets" | "portfolio" | "news" | "calendar" | "orders" | "journal" | "missions" | "bank" | "analytics";

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change: number;
  volatility: number;
  trend: number;
  volume: number;
  sector: string;
  history: Candle[];
}

export interface Position {
  id: string;
  assetId: string;
  side: Side;
  size: number;
  leverage: number;
  entry: number;
  openedAt: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface NewsItem {
  id: string;
  time: number;
  tag: "OFFICIAL" | "RUMOR" | "BREAKING";
  title: string;
  body: string;
  sentiment: number;
  impact: number;
  assets: string[];
}

export interface Order {
  id: string;
  assetId: string;
  side: Side;
  size: number;
  price: number;
  status: "FILLED" | "CLOSED";
  createdAt: number;
  pnl?: number;
}

export interface JournalEntry {
  id: string;
  time: number;
  text: string;
  pnl: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  done: boolean;
}

export interface GameState {
  balance: number;
  equity: number;
  realizedPnl: number;
  credit: number;
  debt: number;
  xp: number;
  reputation: number;
  day: number;
  minute: number;
  tick: number;
  regime: string;
  speed: number;
  selectedAsset: string;
  assets: Asset[];
  positions: Position[];
  orders: Order[];
  news: NewsItem[];
  journal: JournalEntry[];
  missions: Mission[];
  loanRate: number;
}
