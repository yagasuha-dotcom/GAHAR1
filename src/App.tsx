import { useEffect, useMemo, useState } from "react";
import { initialAssets, initialMissions, initialNews } from "./data";
import { Asset, GameState, Page, Position, Side } from "./types";
import { formatMoney, formatPrice, nextPrice, positionMargin, totalUnrealized, unrealized, regimeFor } from "./engine";
import Chart from "./Chart";

const KEY="clint-trade-v2-save";

function fresh():GameState {
  return {
    balance:10000,equity:10000,realizedPnl:0,credit:700,debt:0,xp:0,reputation:50,
    day:1,minute:9*60,tick:0,regime:"SIDEWAYS",speed:1,selectedAsset:"BTCUSD",
    assets:initialAssets,positions:[],orders:[],news:initialNews,journal:[],
    missions:initialMissions,loanRate:7.5
  };
}

function load():GameState {
  try {
    const x=JSON.parse(localStorage.getItem(KEY)||"null");
    if(x && Number.isFinite(x.balance) && Array.isArray(x.assets)) return x;
  } catch {}
  return fresh();
}

const pages: Array<[Page,string,string]> = [
 ["markets","Markets","⌁"],["portfolio","Portfolio","▣"],["news","News","◈"],["calendar","Calendar","◷"],
 ["orders","Orders","≡"],["journal","Journal","✎"],["missions","Missions","★"],["bank","Bank","$"],["analytics","Analytics","⌁"]
];

export default function App(){
  const [s,setS]=useState<GameState>(load);
  const [page,setPage]=useState<Page>("markets");
  const [side,setSide]=useState<Side>("LONG");
  const [size,setSize]=useState("0.01");
  const [lev,setLev]=useState("1");
  const [toast,setToast]=useState("");

  const asset=s.assets.find(a=>a.id===s.selectedAsset) || s.assets[0];
  const uPnl=totalUnrealized(s.assets,s.positions);
  const equity=Math.max(0,s.balance+uPnl);
  const margin=s.positions.reduce((x,p)=>x+positionMargin(p),0);

  useEffect(()=>{ localStorage.setItem(KEY,JSON.stringify({...s,equity})); },[s,equity]);

  useEffect(()=>{
    const ms = s.speed===0 ? 10000000 : Math.max(180,1200/s.speed);
    const id=setInterval(()=>{
      setS(prev=>{
        if(prev.speed===0) return prev;
        const tick=prev.tick+1;
        const regime=regimeFor(tick);
        const assets=prev.assets.map(a=>{
          const price=nextPrice(a,{...prev,tick,regime});
          const old=a.price;
          const last=a.history[a.history.length-1];
          const candleIndex=tick;
          const newCandle={t:candleIndex,o:last?.c===undefined?old:last.c,h:Math.max(last?.c??old,price),l:Math.min(last?.c??old,price),c:price,v:Math.round(a.volume*(.92+((tick+a.id.length)%17)/100))};
          return {...a,price,change:old?((price-old)/old)*100:0,history:[...a.history.slice(-119),newCandle]};
        });
        const nextMinute=prev.minute+1;
        const day=nextMinute>=1440?prev.day+1:prev.day;
        const minute=nextMinute%1440;
        let news=prev.news;
        if(tick%35===0){
          const n=initialNews[(tick/35)%initialNews.length|0];
          news=[...news,{...n,id:`n-${tick}`,time:tick}].slice(-14);
        }
        const eq=Math.max(0,prev.balance+totalUnrealized(assets,prev.positions));
        return {...prev,assets,day,minute,tick,regime,news,equity:eq};
      });
    },ms);
    return ()=>clearInterval(id);
  },[s.speed]);

  const notify=(x:string)=>{setToast(x);setTimeout(()=>setToast(""),2200)};

  function trade(){
    const qty=Number(size), leverage=Math.max(1,Number(lev));
    if(!Number.isFinite(qty)||qty<=0) return notify("Enter a valid size.");
    const required=asset.price*qty/leverage;
    if(required>s.balance+1e-8) return notify("Not enough free balance.");
    const p:Position={id:`P-${Date.now()}`,assetId:asset.id,side,size:qty,leverage,entry:asset.price,openedAt:s.tick};
    setS(prev=>({...prev,positions:[...prev.positions,p],orders:[...prev.orders,{id:`O-${Date.now()}`,assetId:asset.id,side,size:qty,price:asset.price,status:"FILLED",createdAt:prev.tick}],xp:prev.xp+25,missions:prev.missions.map(m=>m.id==="m1"?{...m,done:true}:m)}));
    notify(`${side} ${asset.symbol} opened`);
  }

  function close(p:Position){
    const a=s.assets.find(x=>x.id===p.assetId); if(!a)return;
    const pnl=unrealized(p,a.price);
    setS(prev=>({...prev,balance:prev.balance+pnl,realizedPnl:prev.realizedPnl+pnl,xp:prev.xp+(pnl>0?50:10),
      positions:prev.positions.filter(x=>x.id!==p.id),
      orders:[...prev.orders,{id:`O-${Date.now()}`,assetId:p.assetId,side:p.side,size:p.size,price:a.price,status:"CLOSED",createdAt:prev.tick,pnl}],
      journal:[...prev.journal,{id:`J-${Date.now()}`,time:prev.tick,text:`Closed ${p.side} ${a.symbol} at ${formatPrice(a.price)}`,pnl}],
      missions:prev.missions.map(m=>m.id==="m2"&&pnl>0?{...m,done:true}:m)
    }));
    notify(`Position closed: ${formatMoney(pnl)}`);
  }

  function reset(){localStorage.removeItem(KEY);setS(fresh());setPage("markets");notify("Game reset.");}

  const completed=s.missions.filter(m=>m.done).length;
  const nav=<aside className="sidebar">
    <div className="brand">◇ <b>CLINT TRADE</b><span>V2</span></div>
    <div className="nav">{pages.map(([id,label,icon])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><i>{icon}</i>{label}</button>)}</div>
    <div className="sideBottom"><label>SIM SPEED</label><select value={s.speed} onChange={e=>setS(x=>({...x,speed:Number(e.target.value)}))}><option value={0}>PAUSED</option><option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option><option value={10}>10×</option></select><button className="reset" onClick={reset}>RESET SAVE</button></div>
  </aside>;

  const header=<header className="top"><div><span className="day">DAY {s.day}</span><span>•</span><span>{String(Math.floor(s.minute/60)).padStart(2,"0")}:{String(s.minute%60).padStart(2,"0")}</span><span>•</span><span>REGIME: <b>{s.regime}</b></span></div><div>NET WORTH <b>{formatMoney(equity)}</b></div></header>;

  function Markets(){
    return <div className="content">
      <div className="stats">
        <Stat title="BALANCE" value={formatMoney(s.balance)}/><Stat title="EQUITY" value={formatMoney(equity)}/>
        <Stat title="REALIZED P/L" value={formatMoney(s.realizedPnl)} tone={s.realizedPnl>=0?"good":"bad"}/>
        <Stat title="CREDIT" value={formatMoney(s.credit)}/><Stat title="CAREER" value={`NOVICE • ${s.xp} XP`}/>
      </div>
      <div className="marketGrid">
        <section className="panel chartPanel">
          <div className="panelHead"><div><small>{asset.type} • {asset.symbol}</small><h1>{formatPrice(asset.price)}</h1></div><div className={asset.change>=0?"good":"bad"}>{asset.change>=0?"+":""}{asset.change.toFixed(2)}%</div></div>
          <Chart asset={asset}/>
        </section>
        <section className="panel watch">
          <div className="panelTitle">MARKET WATCH</div>
          {s.assets.map(a=><button key={a.id} className={a.id===asset.id?"watchRow selected":"watchRow"} onClick={()=>setS(x=>({...x,selectedAsset:a.id}))}><span><b>{a.symbol}</b><small>{a.name}</small></span><span className={a.change>=0?"good":"bad"}>{formatPrice(a.price)}<small>{a.change>=0?"+":""}{a.change.toFixed(2)}%</small></span></button>)}
        </section>
      </div>
      <div className="tradeGrid">
        <section className="panel orderPanel">
          <div className="tabs"><button className={side==="LONG"?"long activeTab":""} onClick={()=>setSide("LONG")}>BUY / LONG</button><button className={side==="SHORT"?"short activeTab":""} onClick={()=>setSide("SHORT")}>SELL / SHORT</button></div>
          <label>SIZE<input value={size} onChange={e=>setSize(e.target.value)} inputMode="decimal"/></label>
          <label>LEVERAGE<select value={lev} onChange={e=>setLev(e.target.value)}><option>1</option><option>2</option><option>5</option><option>10</option><option>20</option></select></label>
          <div className="estimate"><span>Margin required</span><b>{formatMoney((Number(size)||0)*asset.price/(Number(lev)||1))}</b></div>
          <button className="execute" onClick={trade}>{side==="LONG"?"CONFIRM LONG":"CONFIRM SHORT"} • {asset.symbol}</button>
        </section>
        <section className="panel newsPanel"><div className="panelTitle">LIVE MARKET NEWS</div>{s.news.slice(-5).reverse().map(n=><div className="newsRow" key={n.id}><span className={n.tag.toLowerCase()}>{n.tag}</span><div><b>{n.title}</b><small>{n.body}</small></div></div>)}</section>
      </div>
      <Positions positions={s.positions} assets={s.assets} onClose={close}/>
    </div>
  }

  function Positions({positions,assets,onClose}:{positions:Position[],assets:Asset[],onClose:(p:Position)=>void}){
    return <section className="panel positions"><div className="panelTitle">OPEN POSITIONS <span>{positions.length}</span></div>{positions.length===0?<div className="empty">No open positions. Pick a market and make your first trade.</div>:positions.map(p=>{const a=assets.find(x=>x.id===p.assetId)!;const pnl=unrealized(p,a.price);return <div className="positionRow" key={p.id}><div><b>{a.symbol} {p.side}</b><small>Entry {formatPrice(p.entry)} • {p.size} • {p.leverage}×</small></div><div>Current {formatPrice(a.price)}</div><strong className={pnl>=0?"good":"bad"}>{formatMoney(pnl)}</strong><button onClick={()=>onClose(p)}>CLOSE</button></div>})}</section>
  }

  function Generic({title,children}:{title:string,children:React.ReactNode}){return <div className="content"><div className="pageTitle"><div><small>CLINT TRADE TERMINAL</small><h1>{title}</h1></div><span>DAY {s.day}</span></div>{children}</div>}

  function Portfolio(){return <Generic title="Portfolio"><div className="stats"><Stat title="NET WORTH" value={formatMoney(equity)}/><Stat title="FREE BALANCE" value={formatMoney(s.balance-margin)}/><Stat title="OPEN P/L" value={formatMoney(uPnl)} tone={uPnl>=0?"good":"bad"}/><Stat title="POSITIONS" value={String(s.positions.length)}/></div><Positions positions={s.positions} assets={s.assets} onClose={close}/></Generic>}
  function News(){return <Generic title="News Feed"><div className="newsList">{s.news.slice().reverse().map(n=><article key={n.id}><div><span className={n.tag.toLowerCase()}>{n.tag}</span><time>Tick {n.time}</time></div><h3>{n.title}</h3><p>{n.body}</p><small>Sentiment {n.sentiment>0?"+":""}{n.sentiment.toFixed(2)} • Impact {(n.impact*100).toFixed(0)}%</small></article>)}</div></Generic>}
  function Calendar(){return <Generic title="Economic Calendar"><div className="calendar"><Cal time="10:00" event="Employment Report" impact="HIGH" effect="Volatility may rise across FX and indices."/><Cal time="13:30" event="Central Bank Rate Decision" impact="HIGH" effect="Rates can shift currencies, banks and risk assets."/><Cal time="15:00" event="Oil Inventory Data" impact="MEDIUM" effect="Energy assets may react sharply."/><Cal time="17:00" event="Tech Earnings Preview" impact="MEDIUM" effect="Technology sentiment may spill into indices." /></div></Generic>}
  function Orders(){return <Generic title="Order History"><div className="table">{s.orders.slice().reverse().map(o=>{const a=s.assets.find(x=>x.id===o.assetId)!;return <div className="tr" key={o.id}><span>{a.symbol}</span><span>{o.side}</span><span>{o.status}</span><span>{formatPrice(o.price)}</span><span className={o.pnl===undefined?"":o.pnl>=0?"good":"bad"}>{o.pnl===undefined?"—":formatMoney(o.pnl)}</span></div>})}</div></Generic>}
  function Journal(){const [text,setText]=useState("");return <Generic title="Trading Journal"><div className="journalBox"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="What did you see? Why did you enter? What risk did you accept?"/><button onClick={()=>{if(text.trim()){setS(x=>({...x,journal:[...x.journal,{id:`j${Date.now()}`,time:x.tick,text:text.trim(),pnl:0}]}));setText("")}}}>SAVE NOTE</button></div>{s.journal.slice().reverse().map(j=><article className="journalEntry" key={j.id}><small>Tick {j.time}</small><p>{j.text}</p></article>)}</Generic>}
  function Missions(){return <Generic title="Missions"><div className="missionGrid">{s.missions.map(m=><div className={m.done?"mission done":"mission"} key={m.id}><div className="missionIcon">{m.done?"✓":"★"}</div><h3>{m.title}</h3><p>{m.description}</p><b>Reward ${m.reward}</b></div>)}</div><div className="progress">{completed}/{s.missions.length} missions complete</div></Generic>}
  function Bank(){const canLoan=s.debt===0;return <Generic title="Bank"><div className="bankCard"><h2>CLINT BANK</h2><p>Credit line available: {formatMoney(s.credit)}</p><p>Outstanding debt: {formatMoney(s.debt)}</p><p>Interest rate: {s.loanRate.toFixed(1)}%</p>{canLoan?<button onClick={()=>setS(x=>({...x,balance:x.balance+Math.min(2000,x.credit),debt:Math.min(2000,x.credit)}))}>BORROW $2,000</button>:<button onClick={()=>{const pay=Math.min(s.debt,s.balance);setS(x=>({...x,balance:x.balance-pay,debt:x.debt-pay}))}}>REPAY FROM BALANCE</button>}</div></Generic>}
  function Analytics(){const win=s.orders.filter(o=>o.status==="CLOSED"&&typeof o.pnl==="number"&&o.pnl>0).length;const closed=s.orders.filter(o=>o.status==="CLOSED").length;return <Generic title="Analytics"><div className="stats"><Stat title="TRADES CLOSED" value={String(closed)}/><Stat title="WIN RATE" value={closed?`${Math.round(win/closed*100)}%`:"—"}/><Stat title="REPUTATION" value={`${s.reputation}/100`}/><Stat title="DEBT" value={formatMoney(s.debt)}/></div><div className="panel explanation"><h2>Market Engine</h2><p>Prices combine regime, asset trend, deterministic volatility, mean reversion and current news. The simulation is fictional and designed for practice—not connected to real brokers or money.</p></div></Generic>}

  const view = page==="markets"?<Markets/>:page==="portfolio"?<Portfolio/>:page==="news"?<News/>:page==="calendar"?<Calendar/>:page==="orders"?<Orders/>:page==="journal"?<Journal/>:page==="missions"?<Missions/>:page==="bank"?<Bank/>:<Analytics/>;

  return <div className="app">{header}{nav}<main>{view}</main>{toast&&<div className="toast">{toast}</div>}</div>
}

function Stat({title,value,tone}:{title:string,value:string,tone?:string}){return <div className="stat"><small>{title}</small><b className={tone||""}>{value}</b></div>}
function Cal({time,event,impact,effect}:{time:string,event:string,impact:string,effect:string}){return <div className="calRow"><time>{time}</time><div><b>{event}</b><small>{effect}</small></div><span className={impact==="HIGH"?"high":"medium"}>{impact}</span></div>}
