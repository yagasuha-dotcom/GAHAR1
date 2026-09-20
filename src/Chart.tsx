import React from "react";
import { Asset } from "./types";
import { formatPrice } from "./engine";

export default function Chart({asset}:{asset:Asset}) {
  const candles = asset.history.slice(-48);
  const width = 900, height = 330;
  const pad = {l:12,r:70,t:18,b:24};
  const min = Math.min(...candles.map(c=>c.l));
  const max = Math.max(...candles.map(c=>c.h));
  const range = Math.max(max-min, .000001);
  const xStep = (width-pad.l-pad.r)/Math.max(1,candles.length-1);
  const y = (p:number) => pad.t + (max-p)/range*(height-pad.t-pad.b);
  const x = (i:number) => pad.l+i*xStep;
  return <div className="chartWrap">
    <svg viewBox={`0 0 ${width} ${height}`} className="chart">
      {[0,1,2,3,4].map(i=><line key={i} x1={pad.l} x2={width-pad.r} y1={pad.t+i*(height-pad.t-pad.b)/4} y2={pad.t+i*(height-pad.t-pad.b)/4} className="grid"/>)}
      {candles.map((c,i)=>{
        const up=c.c>=c.o, cx=x(i), bodyTop=y(Math.max(c.o,c.c)), bodyBottom=y(Math.min(c.o,c.c));
        const bw=Math.max(3,xStep*.55);
        return <g key={c.t}>
          <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} className={up?"wick up":"wick down"}/>
          <rect x={cx-bw/2} y={bodyTop} width={bw} height={Math.max(2,bodyBottom-bodyTop)} className={up?"candle up":"candle down"}/>
        </g>
      })}
      <text x={width-66} y={y(asset.price)+4} className="priceLabel">{formatPrice(asset.price)}</text>
      <text x={12} y={16} className="axisLabel">OHLC • {asset.symbol}</text>
    </svg>
  </div>
}
