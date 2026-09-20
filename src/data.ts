import { Asset, Candle, Mission, NewsItem } from "./types";

const makeHistory = (price: number, seed: number): Candle[] => {
  const out: Candle[] = [];
  let p = price;
  for (let i = 0; i < 80; i++) {
    const wave = Math.sin((i + seed) / 7) * 0.004;
    const noise = (((i * 17 + seed * 13) % 101) - 50) / 10000;
    const r = wave + noise;
    const o = p;
    const c = Math.max(0.0001, p * (1 + r));
    const h = Math.max(o, c) * (1 + 0.0015 + ((i * 7) % 5) / 10000);
    const l = Math.min(o, c) * (1 - 0.0015 - ((i * 3) % 5) / 10000);
    out.push({ t: i, o, h, l, c, v: 1000 + (i * 73) % 5000 });
    p = c;
  }
  return out;
};

const raw: Array<Omit<Asset, "history" | "change">> = [
  { id:"BTCUSD", symbol:"BTC/USD", name:"Bitcoin", type:"CRYPTO", price:103762.4, volatility:.9, trend:.1, volume:24000, sector:"CRYPTO" },
  { id:"ETHUSD", symbol:"ETH/USD", name:"Ethereum", type:"CRYPTO", price:3820.5, volatility:1.15, trend:.08, volume:18000, sector:"CRYPTO" },
  { id:"CLNT", symbol:"CLNT", name:"Clint Coin", type:"CRYPTO", price:12.84, volatility:1.8, trend:.12, volume:9500, sector:"CRYPTO" },
  { id:"EURUSD", symbol:"EUR/USD", name:"Euro / Dollar", type:"FOREX", price:1.1732, volatility:.35, trend:.02, volume:42000, sector:"FX" },
  { id:"GBPUSD", symbol:"GBP/USD", name:"Pound / Dollar", type:"FOREX", price:1.3564, volatility:.48, trend:.01, volume:36000, sector:"FX" },
  { id:"NEXA", symbol:"NEXA", name:"NEXA TECH", type:"STOCK", price:184.2, volatility:.72, trend:.05, volume:12000, sector:"TECH" },
  { id:"CLBANK", symbol:"CLBK", name:"CLINT BANK", type:"STOCK", price:76.45, volatility:.55, trend:-.02, volume:8500, sector:"BANKING" },
  { id:"VORTEX", symbol:"VTX", name:"VORTEX ENERGY", type:"STOCK", price:129.7, volatility:.68, trend:.04, volume:9100, sector:"ENERGY" },
  { id:"GOLD", symbol:"XAU/USD", name:"Gold", type:"COMMODITY", price:2674.2, volatility:.42, trend:.03, volume:30000, sector:"METALS" },
  { id:"OIL", symbol:"WTI", name:"Crude Oil", type:"COMMODITY", price:72.18, volatility:.95, trend:-.01, volume:21000, sector:"ENERGY" },
  { id:"CLINT100", symbol:"CLINT 100", name:"Clint 100 Index", type:"INDEX", price:6842.1, volatility:.55, trend:.06, volume:17000, sector:"INDEX" },
  { id:"GLOBAL500", symbol:"GLOBAL 500", name:"Global 500 Index", type:"INDEX", price:5120.8, volatility:.45, trend:.03, volume:14000, sector:"INDEX" }
];

export const initialAssets: Asset[] = raw.map((a, i) => {
  const history = makeHistory(a.price, i + 4);
  const last = history[history.length - 1];
  return {...a, history, change: ((last.c - history[history.length - 2].c) / history[history.length - 2].c) * 100};
});

export const initialNews: NewsItem[] = [
  {id:"n1", time:0, tag:"OFFICIAL", title:"Central bank keeps rates unchanged", body:"Policy makers signal a cautious path while watching inflation and employment.", sentiment:.15, impact:.42, assets:["EURUSD","GBPUSD","GLOBAL500","CLINT100"]},
  {id:"n2", time:0, tag:"RUMOR", title:"Technology demand expected to accelerate", body:"Industry chatter points to stronger enterprise spending next quarter.", sentiment:.55, impact:.35, assets:["NEXA","CLINT100","GLOBAL500","BTCUSD"]},
  {id:"n3", time:0, tag:"BREAKING", title:"Oil supply disruption reported", body:"A fictional production outage creates short-term energy volatility.", sentiment:-.35, impact:.7, assets:["OIL","VORTEX","GLOBAL500"]},
  {id:"n4", time:0, tag:"OFFICIAL", title:"Employment beats expectations", body:"Labor conditions improve, supporting risk appetite.", sentiment:.3, impact:.4, assets:["GLOBAL500","CLINT100","EURUSD","NEXA"]},
  {id:"n5", time:0, tag:"RUMOR", title:"Major bank reviews credit exposure", body:"Traders watch for possible tightening in lending conditions.", sentiment:-.45, impact:.45, assets:["CLBANK","GLOBAL500","CLINT100"]},
];

export const initialMissions: Mission[] = [
  {id:"m1", title:"First Trade", description:"Open your first market position.", reward:150, done:false},
  {id:"m2", title:"Risk Manager", description:"Close a position with a positive P/L.", reward:250, done:false},
  {id:"m3", title:"Market Student", description:"Read 5 news events.", reward:100, done:false},
  {id:"m4", title:"Survivor", description:"Keep equity above $9,000 for 20 ticks.", reward:500, done:false}
];
