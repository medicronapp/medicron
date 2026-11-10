// Reprodução dos widgets do iOS (tela de bloqueio e tela inicial) para as imagens da App Store. Eles são nativos (SwiftUI)
// e não existem no app web, então não dá para fotografá-los como as outras telas: este módulo os redesenha em HTML seguindo
// o código em src/widgets/* (mesmos textos, estilos de texto, cores e disposição), alimentado pelas MESMAS props que o app
// entrega ao widget (WidgetProps). Rodam no Chrome do macOS, que tem a fonte do sistema (SF).
import type { WidgetProps } from "../src/lib/widget-data";

const TZ = "America/Sao_Paulo";
/** pt → px: a tela do iPhone Pro Max tem 430 pt e, na imagem (1000 px de celular − 2×26 de borda), 948 px. */
const PT = 948 / 430;

const symbol = {
  pills: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.2" y="8.6" width="19.6" height="6.8" rx="3.4" transform="rotate(-45 12 12)" fill="currentColor"/><path d="M9.2 14.8 14.8 9.2" stroke="rgba(0,0,0,.28)" stroke-width="1.6" stroke-linecap="round"/></svg>',
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 6.6v6.4" stroke="var(--cut)" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.4" fill="var(--cut)"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.4 12.4 3.2 3.2 6-6.4" fill="none" stroke="var(--cut)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
const torch = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v3l-1.6 2.4V20a1.4 1.4 0 0 1-1.4 1.4h-2A1.4 1.4 0 0 1 9.6 20V8.4L8 6z"/><path d="M12 11.5v2.6"/></svg>';
const camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5A2 2 0 0 1 5.5 6.5H8l1.4-2h5.2l1.4 2h2.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.6" r="3.6"/></svg>';
const mark = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0f766e"/><circle cx="32" cy="32" r="17" stroke="#f3fbfa" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="89 18" transform="rotate(-90 32 32)"/><circle cx="23.5" cy="17.5" r="4.2" fill="#99f6e4"/></svg>';

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A contagem que o sistema mostra ("em 20 min", "em 8 h 20 min"), em pt-BR. */
export function relativeIn(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `em ${h} h ${m} min` : `em ${h} h`;
}

const pendingText = (p: WidgetProps) => `${p.pendingCount === 1 ? "1 pendente" : `${p.pendingCount} pendentes`} desde ${p.pendingSince}`;
const pct = (p: WidgetProps) => (p.total > 0 ? Math.round((100 * p.resolved) / p.total) : 0);

/** Widget "Agora" (retangular, tela de bloqueio): remédio; horário · paciente · contagem; pendentes. */
function agoraRect(p: WidgetProps, now: Date): string {
  const next = p.upcoming[0];
  const l3 = p.pendingCount > 0
    ? `<div class="l3 strong">${symbol.alert}<b>${esc(pendingText(p))}</b></div>`
    : `<div class="l3 sec">${symbol.check}<span>Sem pendências</span></div>`;
  return `<div class="rect"><b class="l1">${esc(next ? next.item : "Nenhuma dose a seguir")}</b>${next ? `<div class="l2"><span class="mono">${esc(next.time)}</span><span class="sec">${esc(`· ${next.patient} ·`)}</span><span class="sec">${relativeIn(next.at - now.getTime())}</span></div>` : ""}${l3}</div>`;
}

/** Widget "Progresso" (retangular): "horário · paciente", remédio e a barra do dia com as pendentes ao lado. */
function progressoRect(p: WidgetProps): string {
  const next = p.upcoming[0];
  const head = next
    ? `<span class="sec mono cap">${esc(`${next.time} · ${next.patient}`)}</span><b class="l1">${esc(next.item)}</b>`
    : `<b class="l1">Nenhuma dose a seguir</b>`;
  const pend = p.pendingCount > 0 ? `<span class="pend">${symbol.alert}<b>${p.pendingCount}</b></span>` : "";
  return `<div class="rect prog">${head}<div class="row">${pend}<span class="bar"><i style="width:${pct(p)}%"></i></span><span class="sec mono c2">${p.resolved}/${p.total}</span></div></div>`;
}

/** Widget em linha (acima do relógio): "12:00 Losartana · 1 pend.". */
function inlineLine(p: WidgetProps): string {
  const next = p.upcoming[0];
  const line = [next ? `${next.time} ${next.item}` : "Sem próximas", p.pendingCount > 0 ? `${p.pendingCount} pend.` : ""].filter(Boolean).join(" · ");
  return `<div class="inline">${symbol.pills}<span>${esc(line)}</span></div>`;
}

/** Widget médio (tela inicial): anel do dia à esquerda; à direita as 2 próximas doses e o resumo de pendentes. */
function mediumWidget(p: WidgetProps, now: Date): string {
  const r = 45.5, c = 2 * Math.PI * r;
  const frac = p.total > 0 ? p.resolved / p.total : 0;
  const ring = `<div class="ring"><svg viewBox="0 0 102 102" aria-hidden="true"><circle cx="51" cy="51" r="${r}" fill="none" stroke="rgba(15,118,110,.18)" stroke-width="9"/><circle cx="51" cy="51" r="${r}" fill="none" stroke="#0f766e" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 51 51)"/></svg><div class="mid"><b>${p.resolved}</b><span>${esc(`de ${p.total}`)}</span></div></div>`;
  const rows = p.upcoming.length === 0
    ? `<b class="h">${p.pendingCount === 0 ? "Tudo em dia" : "Nenhuma dose a seguir"}</b>`
    : p.upcoming.slice(0, 2).map((u) => `<div class="mrow"><span class="t mono">${esc(u.time)}</span><div><b class="h">${esc(u.item)}</b><div class="sub"><span>${esc(u.patient)}</span><span>${relativeIn(u.at - now.getTime())}</span></div></div></div>`).join("");
  const foot = p.pendingCount > 0
    ? `<div class="foot red">${symbol.alert}<b>${p.pendingCount === 1 ? "1 pendente" : `${p.pendingCount} pendentes`}</b><span class="sec cap">${esc(`desde ${p.pendingSince}`)}</span></div>`
    : `<div class="foot acc">${symbol.check}<b class="sec">Sem pendências</b></div>`;
  return `<div class="medium">${ring}<div class="col">${rows}<hr>${foot}</div></div>`;
}

const clock = (now: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
const dateLine = (now: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(now);

/**
 * O conteúdo da tela do celular: `lock` = tela de bloqueio (data, widget em linha, hora, widgets "Agora" e "Progresso");
 * `home` = tela inicial (widget médio e ícones). `k` é a escala do slide (1 = 1320 px de largura).
 */
export function renderWidgetScreen(kind: "lock" | "home", props: WidgetProps, now: Date, k: number): string {
  const u = PT * k;
  const n = (v: number) => `${Math.round(v * u * 10) / 10}px`;
  const css = `<style>
.ws{position:relative;width:100%;height:${n(932)};overflow:hidden;font-family:-apple-system,"SF Pro Text","SF Pro Display",Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.ws svg{display:block}.ws .mono{font-variant-numeric:tabular-nums}
.ws-lock{background:radial-gradient(90% 40% at 0% 100%,oklch(0.55 0.1 190 / .9) 0%,transparent 65%),radial-gradient(80% 36% at 100% 30%,oklch(0.5 0.1 215 / .7) 0%,transparent 70%),linear-gradient(165deg,oklch(0.36 0.08 200) 0%,oklch(0.22 0.06 238) 100%);color:#fff;text-align:center;--cut:rgba(40,60,66,.9)}
.ws-lock .lk{position:absolute;left:50%;top:${n(66)};width:${n(16)};margin-left:${n(-8)};color:rgba(255,255,255,.9)}
.ws-lock .date{position:absolute;left:0;right:0;top:${n(96)};font-size:${n(21)};font-weight:600;color:rgba(255,255,255,.88)}
.ws-lock .inline{position:absolute;left:0;right:0;top:${n(126)};display:flex;justify-content:center;align-items:center;gap:${n(5)};font-size:${n(17)};font-weight:500;color:rgba(255,255,255,.92)}
.ws-lock .inline svg{width:${n(17)};height:${n(17)}}
.ws-lock .time{position:absolute;left:0;right:0;top:${n(150)};font-size:${n(104)};line-height:1.05;font-weight:600;letter-spacing:-.025em;color:rgba(255,255,255,.93)}
.ws-lock .widgets{position:absolute;left:0;right:0;top:${n(290)};display:flex;justify-content:center;gap:${n(12)}}
.ws-lock .rect{width:${n(160)};height:${n(72)};padding:${n(8)} ${n(11)};border-radius:${n(18)};background:rgba(255,255,255,.17);text-align:left;display:flex;flex-direction:column;justify-content:center;gap:${n(1)};overflow:hidden}
.ws-lock .rect .l1{font-size:${n(15)};font-weight:600;line-height:1.15;white-space:nowrap}
.ws-lock .rect .l2{display:flex;gap:${n(3)};font-size:${n(12)};line-height:1.2;white-space:nowrap}
.ws-lock .rect .l3{display:flex;align-items:center;gap:${n(3)};font-size:${n(11.5)};line-height:1.2;white-space:nowrap}
.ws-lock .rect .l3 svg{width:${n(12)};height:${n(12)}}
.ws-lock .sec{color:rgba(255,255,255,.62)}
.ws-lock .deco{position:absolute;left:50%;border-radius:50%;border:${n(1.5)} solid rgba(255,255,255,.1)}
.ws-lock .d1{top:${n(440)};width:${n(430)};height:${n(430)};margin:0 0 0 ${n(-215)}}
.ws-lock .d2{top:${n(500)};width:${n(310)};height:${n(310)};margin:0 0 0 ${n(-155)}}
.ws-lock .d3{top:${n(560)};width:${n(190)};height:${n(190)};margin:0 0 0 ${n(-95)};background:rgba(255,255,255,.04)}
.ws-lock .btns{position:absolute;left:${n(46)};right:${n(46)};bottom:${n(52)};display:flex;justify-content:space-between}
.ws-lock .btns span{width:${n(50)};height:${n(50)};border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff}
.ws-lock .btns svg{width:${n(24)};height:${n(24)}}
.ws-lock .homebar{position:absolute;left:50%;bottom:${n(10)};width:${n(140)};height:${n(5)};margin-left:${n(-70)};border-radius:99px;background:rgba(255,255,255,.85)}
.ws-lock .prog .cap{font-size:${n(12)};line-height:1.2;white-space:nowrap}
.ws-lock .prog .row{display:flex;align-items:center;gap:${n(6)};margin-top:${n(3)}}
.ws-lock .prog .pend{display:flex;align-items:center;gap:${n(2)};font-size:${n(13)}}
.ws-lock .prog .pend svg{width:${n(13)};height:${n(13)}}
.ws-lock .bar{flex:1;height:${n(6)};border-radius:99px;background:rgba(255,255,255,.3);overflow:hidden}
.ws-lock .bar i{display:block;height:100%;border-radius:99px;background:#fff}
.ws-lock .prog .c2{font-size:${n(11)}}
.ws-home{background:linear-gradient(160deg,oklch(0.84 0.09 188) 0%,oklch(0.76 0.09 225) 62%,oklch(0.74 0.1 262) 100%);color:#000;--cut:#fff}
.ws-home .sb{position:absolute;top:${n(20)};left:${n(40)};right:${n(36)};display:flex;justify-content:space-between;align-items:center;font-size:${n(17)};font-weight:600;color:#10201f}
.ws-home .batt{width:${n(26)};height:${n(12)};border-radius:${n(4)};border:${n(1.4)} solid rgba(16,32,31,.5);position:relative}.ws-home .batt i{position:absolute;inset:${n(1.6)};border-radius:${n(2)};background:#10201f}
.ws-home .medium{position:absolute;left:${n(46)};top:${n(78)};width:${n(338)};height:${n(158)};padding:${n(16)};border-radius:${n(24)};background:#fff;box-shadow:0 ${n(8)} ${n(22)} rgba(10,60,60,.2);display:flex;align-items:center;gap:${n(14)}}
.ws-home .ring{position:relative;width:${n(102)};height:${n(102)};flex:none}.ws-home .ring svg{width:100%;height:100%}
.ws-home .mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ws-home .mid b{font-size:${n(40)};line-height:1;font-weight:700;font-family:ui-rounded,"SF Pro Rounded",-apple-system,sans-serif;letter-spacing:-.01em}
.ws-home .mid span{font-size:${n(11)};color:rgba(60,60,67,.6);margin-top:${n(1)}}
.ws-home .col{flex:1;min-width:0;display:flex;flex-direction:column;gap:${n(8)}}
.ws-home .mrow{display:flex;gap:${n(10)};align-items:flex-start}
.ws-home .mrow .t{font-size:${n(17)};font-weight:600;color:#0f766e;line-height:1.2}
.ws-home .h{font-size:${n(17)};font-weight:600;line-height:1.2;display:block;white-space:nowrap}
.ws-home .sub{display:flex;gap:${n(4)};font-size:${n(15)};color:rgba(60,60,67,.6);line-height:1.2;white-space:nowrap}
.ws-home hr{border:0;height:${n(1)};background:rgba(60,60,67,.22);margin:0}
.ws-home .foot{display:flex;align-items:center;gap:${n(6)};font-size:${n(15)};white-space:nowrap}
.ws-home .foot svg{width:${n(15)};height:${n(15)}}
.ws-home .foot.red{color:#ff3b30}.ws-home .foot.acc{color:#0f766e}.ws-home .sec{color:rgba(60,60,67,.6)}.ws-home .cap{font-size:${n(12)}}
.ws-home .grid{position:absolute;left:${n(30)};right:${n(30)};top:${n(272)};display:grid;grid-template-columns:repeat(4,1fr);row-gap:${n(22)};justify-items:center}
.ws-home .app{width:${n(62)};text-align:center;font-size:${n(11)};font-weight:500;color:#10201f}
.ws-home .app svg,.ws-home .app .ph{width:${n(62)};height:${n(62)};border-radius:${n(15)};display:block;margin-bottom:${n(5)}}
.ws-home .ph{background:rgba(255,255,255,.42)}
.ws-home .dock{position:absolute;left:${n(18)};right:${n(18)};bottom:${n(14)};height:${n(92)};border-radius:${n(34)};background:rgba(255,255,255,.34);display:flex;justify-content:space-around;align-items:center}
.ws-home .dock .ph{width:${n(62)};height:${n(62)};border-radius:${n(15)};background:rgba(255,255,255,.55)}
</style>`;
  if (kind === "lock") {
    return `${css}<div class="ws ws-lock"><div class="lk">${symbol.lock}</div><div class="date">${esc(dateLine(now))}</div>${inlineLine(props)}<div class="time">${clock(now)}</div><div class="deco d1"></div><div class="deco d2"></div><div class="deco d3"></div><div class="widgets">${agoraRect(props, now)}${progressoRect(props)}</div><div class="btns"><span>${torch}</span><span>${camera}</span></div><div class="homebar"></div></div>`;
  }
  const ph = '<div class="app"><div class="ph"></div></div>';
  return `${css}<div class="ws ws-home"><div class="sb"><span>${clock(now)}</span><span class="batt"><i></i></span></div>${mediumWidget(props, now)}<div class="grid"><div class="app">${mark}Medicron</div>${ph.repeat(19)}</div><div class="dock"><div class="ph"></div><div class="ph"></div><div class="ph"></div><div class="ph"></div></div></div>`;
}
