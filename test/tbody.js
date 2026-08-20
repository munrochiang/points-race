const T=[]; function t(n,f){try{f();T.push(['✅',n])}catch(e){T.push(['❌',n+' — '+e.message])}}
function eq(a,b,l){if(a!==b)throw new Error(`${l}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`)}
const g0=groups.find(g=>g.athletes.some(a=>a.bib==='1035')); currentGroupId=g0.id;  // 至凱 那組（75 H2）
const REAL=document.getElementById;
function reset(){currentGroupId=g0.id;g0.athletes.forEach(a=>a.score=0);g0.history=[];g0.currentSprintIdx=0;g0.progressSprintIdx=0;g0.starPos={};g0.focusBib=null;roundPos={};roundPicks=[];forwardStack=[];g0.sprintLaps=defaultSprintLaps(15);}
const FB='1035';  // 至凱 的號碼布（該組唯一星號）
const setPos=p=>{g0.starPos[FB]=p;};
const set=m=>{for(const[b,v] of Object.entries(m)){g0.athletes.find(x=>x.bib===b).score=v;}};
const TX=(h)=>String(h).replace(/<[^>]*>/g,'').replace(/\s+/g,' ');
const R=()=>{const el={innerHTML:''};document.getElementById=()=>el;renderAdvice();document.getElementById=REAL;return el.innerHTML;};

t('位置是「本圈」欄位，且以號碼布為 key（一組可有多位王者）', ()=>{ reset();
  setStarPos('front'); eq(roundPos[FB],'front','roundPos[bib]'); eq(g0.starPos[FB],'front','生效值');
  setStarPos('front'); eq(roundPos[FB],undefined,'再點取消'); });
t('位置寫進該圈的 history 紀錄', ()=>{ reset();
  setStarPos('back'); onTapAthlete('2273'); onTapAthlete('1494'); commitRound(true);
  eq(g0.history.length,1,'筆數'); eq(g0.history[0].pos[FB],'back','該圈位置');
  eq(Object.keys(roundPos).length,0,'提交後重置'); });
t('未確認 → 沿用上一圈並寫入紀錄', ()=>{ reset();
  setStarPos('front'); onTapAthlete('2273'); onTapAthlete('1494'); commitRound(true);
  onTapAthlete('1186'); onTapAthlete('2204'); commitRound(true);   // 第 2 圈沒點位置
  eq(g0.history[1].pos[FB],'front','沿用上一圈'); });
t('沒聽清楚那圈也會記位置', ()=>{ reset();
  setStarPos('dropped'); commitUncertainRound();
  eq(g0.history[0].uncertain,true,'uncertain'); eq(g0.history[0].pos[FB],'dropped','位置'); });
t('位置軌跡（最近 4 圈）', ()=>{ reset();
  for(const p of ['front','front','back','dropped']){ setStarPos(p); commitUncertainRound(); }
  eq(analyze().trail.join(','),'front,front,back,dropped','trail'); });
t('未選位置 → 建議明確要求先輸入', ()=>{ reset();
  const h=R(); if(!/先選/.test(h)||!/沒有位置就給不出建議/.test(h)) throw new Error('缺提示：'+h.slice(0,160)); });

// ── 15 種處境：得分狀態 × 位置 ──
const S={ OK:()=>{}, TIGHT:()=>set({'2273':6,'1494':4,'1186':2,'2204':2,'2089':1,'1246':1}),
  MUST:()=>set({'2273':6,'1494':4,'1186':2,'2204':2,'2089':1,'1246':1,'1076':1,'1588':1}),
  SAFE:()=>set({'2273':6,'1035':2}),
  OUT_PTS:()=>set({'2273':9,'1494':8,'1186':7,'2204':6,'2089':5,'1076':4,'1588':3,'1246':2,'1035':1}) };
for(const [k,mk] of Object.entries(S)) for(const p of ['front','back','dropped']){
  t(`處境 ${k} × ${p}`, ()=>{ reset(); mk(); setPos(p);
    const A=analyze(); eq(A.sc,k,'狀態分類');
    const h=R();
    if(!/class="order"/.test(h)) throw new Error('缺指令');
    if(!/class="how"/.test(h)) throw new Error('缺方法');
    if(!/(集團前段|集團後段|已掉出集團)/.test(h)) throw new Error('狀態行沒帶位置');
    // 掉隊且非 SAFE → 一定紅燈
    if(p==='dropped'&&k!=='SAFE'&&!/alarm red/.test(h)) throw new Error('掉隊應紅燈');
    if(p==='dropped'&&k==='SAFE'&&!/alarm green/.test(h)) throw new Error('有分掉隊應綠燈（分數贏過所有0分）');
  });
}
t('SAFE×dropped 明確說「不用冒摔倒風險」', ()=>{ reset(); S.SAFE(); setPos('dropped');
  if(!/不用為了名次冒摔倒的風險/.test(TX(R()))) throw new Error('缺'); });
t('MUST×back 明確說「先上前段否則搶不到」', ()=>{ reset(); S.MUST(); setPos('back');
  if(!/先上到前段，否則搶不到/.test(TX(R()))) throw new Error('缺'); });
t('MUST×front 明確說「貼線拿第2名、不用破風」', ()=>{ reset(); S.MUST(); setPos('front');
  if(!/不用破風/.test(TX(R()))) throw new Error('缺'); });
const ORD=(h)=>{const m=String(h).match(/class="order">([\s\S]*?)<\/div>/); return m?m[1].replace(/<[^>]*>/g,'').trim():'';};
t('★ 大字指令隨【位置】改變（固定得分狀態）', ()=>{ reset();
  set({'2273':8,'1494':6,'1186':4,'2204':3,'2089':2,'1246':1});
  const seen=new Set();
  for(const p of ['front','back','dropped']){ setPos(p); roundPos={}; seen.add(ORD(R())); }
  eq(seen.size,3,'三種位置應給三句不同的大字指令'); });
t('★ 大字指令隨【得分狀態】改變（固定位置=前段）', ()=>{
  const seen=new Set();
  for(const mk of [S.OK,S.TIGHT,S.MUST,S.SAFE,S.OUT_PTS]){ reset(); mk(); setPos('front'); seen.add(ORD(R())); }
  eq(seen.size,5,'五種得分狀態應給五句不同的大字指令'); });
t('★ 大字指令是「要做什麼」不是「幾個人得分」', ()=>{ reset();
  S.MUST(); setPos('back'); const o=ORD(R());
  if(/得分|名額|分數/.test(o)) throw new Error('大字不該是狀態描述：'+o);
  if(!/先上到前段/.test(o)) throw new Error('大字應為指令：'+o); });
t('未選位置時大字是「先選位置」，不是建議', ()=>{ reset(); S.MUST(); g0.starPos={}; roundPos={};
  if(!/先選/.test(ORD(R()))) throw new Error('應要求先選位置'); });
t('內建 7 組（兒童組且有王者），第一組是場次 75 H1', ()=>{ eq(groups.length,7,'組數');
  if(!/^75｜.*H1/.test(groups[0].name)) throw new Error('第一組錯: '+groups[0].name);
  eq(g0.athletes.length,16,'至凱組人數'); });
t('★ 每組名稱都以場次號碼開頭，且依場次遞增（＝時間序）', ()=>{
  const nos=groups.map(g=>{ const m=g.name.match(/^(\d+)｜/); if(!m) throw new Error('名稱缺場次: '+g.name); return +m[1]; });
  eq(nos.join(','), [...nos].sort((a,b)=>a-b).join(','), '應依場次遞增');
  eq(nos.join(','),'75,75,136,137,138,139,143','場次清單'); });
t('每組名稱都含日期與估計時間', ()=>{
  groups.forEach(g=>{ if(!/8\/2[01] \d{2}:\d{2}/.test(g.name)) throw new Error('缺日期時間: '+g.name); }); });
t('★ 每組至少一位星號，且星號全部是王者（1001–1050）', ()=>{
  groups.forEach(g=>{
    const st=g.athletes.filter(a=>a.starred);
    if(st.length<1) throw new Error(g.name+' 沒有星號');
    st.forEach(a=>{ const b=parseInt(a.bib,10);
      if(!(b>=1001&&b<=1050)) throw new Error(`${g.name} 星號 ${a.bib} 不在王者區間`); });
    // 反向：組內所有 1001–1050 的人都必須被標星號
    g.athletes.forEach(a=>{ const b=parseInt(a.bib,10);
      if(b>=1001&&b<=1050&&!a.starred) throw new Error(`${g.name} 王者 ${a.bib} 未標星號`); });
  }); });
t('★ 137 預設焦點＝seed 最前的星號（不是號碼布最小的）', ()=>{
  const g=groups.find(x=>/^137｜/.test(x.name));
  currentGroupId=g.id; g.athletes.forEach(a=>a.score=0); g.focusBib=null; g.starPos={}; roundPos={};
  const A=analyze();
  const firstStar=g.athletes.filter(a=>a.starred)[0];
  eq(A.focusBib, firstStar.bib, '預設焦點');
  const minBibStar=[...g.athletes.filter(a=>a.starred)].sort((a,b)=>parseInt(a.bib)-parseInt(b.bib))[0];
  if(firstStar.bib===minBibStar.bib) throw new Error('seed 最前恰為號碼布最小，測不出差異');
  currentGroupId=g0.id; });
t('★ 場次 137 兒童C女 有 4 位王者全部標星號', ()=>{
  const g=groups.find(x=>/^137｜/.test(x.name));
  if(!g) throw new Error('找不到 137');
  const st=g.athletes.filter(a=>a.starred).map(a=>a.bib).sort();
  eq(st.join(','),'1011,1013,1021,1023','四位王者'); });
t('★ 多位王者：焦點可切換，位置各自獨立', ()=>{
  const g=groups.find(x=>/^137｜/.test(x.name));
  currentGroupId=g.id; g.athletes.forEach(a=>a.score=0);
  g.history=[]; g.currentSprintIdx=0; g.progressSprintIdx=0; g.starPos={}; g.focusBib=null; roundPos={};
  let A=analyze(); eq(A.stars.length,4,'星號數');
  const first=A.focusBib;
  const second=A.stars.map(s=>s.bib).find(b=>b!==first);   // 不寫死號碼布
  setStarPos('front'); eq(g.starPos[first],'front','焦點1 位置');
  setFocus(second); A=analyze(); eq(A.focusBib,second,'切換焦點');
  eq(A.pos,null,'焦點2 尚未設位置');
  setStarPos('dropped'); eq(g.starPos[second],'dropped','焦點2 位置');
  eq(g.starPos[first],'front','焦點1 位置未被覆蓋');
  // 提交後快照包含兩人
  commitUncertainRound();
  eq(g.history[0].pos[first],'front','快照含焦點1');
  eq(g.history[0].pos[second],'dropped','快照含焦點2');
  currentGroupId=g0.id; });
t('每組人數／距離／晉級線合理，且號碼與姓名乾淨', ()=>{
  groups.forEach(g=>{
    if(g.athletes.length<10||g.athletes.length>25) throw new Error(g.name+' 人數異常 '+g.athletes.length);
    if(![3000,5000].includes(g.raceDistance)) throw new Error(g.name+' 距離異常');
    if(!(g.cutLine>=8&&g.cutLine<=12)) throw new Error(g.name+' cutLine 異常 '+g.cutLine);
    const laps=g.raceDistance/200;
    eq(g.sprintLaps.length, laps-3, g.name+' 計分圈數');
    g.athletes.forEach(a=>{
      if(!/^\d{4}$/.test(a.bib)) throw new Error(g.name+' bib 異常 '+JSON.stringify(a.bib));
      if(!a.name||/[\x00-\x1f\s]/.test(a.name)) throw new Error(g.name+' 姓名含控制字元/空白 '+JSON.stringify(a.name));
    });
    const bibs=new Set(g.athletes.map(a=>a.bib));
    eq(bibs.size,g.athletes.length,g.name+' 號碼重複');
  }); });
t('全部都是兒童組 3000m 計分（12 個計分圈）', ()=>{
  groups.forEach(g=>{ eq(g.raceDistance,3000,g.name+' 距離');
    eq(g.sprintLaps.length,12,g.name+' 計分圈');
    if(!/兒童/.test(g.name)) throw new Error('非兒童組: '+g.name); }); });
t('★ 每組都有 seed，且順序 = 陣列索引', ()=>{
  groups.forEach(g=>g.athletes.forEach((a,i)=>eq(a.seed,i,g.name+' seed')));
});
t('★ 同分時按 seed 排，不是按號碼布', ()=>{
  const g=g0;
  // 至凱 seed=8（推估第 9），號碼布 1035 偏小；若用 bib 當 tiebreak 他會被排到很前面
  const before=[...g.athletes].map(a=>a.bib);
  g.athletes.forEach(a=>a.score=0);
  g.athletes.sort(byScoreThenSeed);
  eq(g.athletes.map(a=>a.bib).join(','), before.join(','), '全 0 分時應維持推估順序');
  // 驗證真的不是 bib 序
  const byBib=[...g.athletes].sort((a,b)=>parseInt(a.bib)-parseInt(b.bib)).map(a=>a.bib).join(',');
  if(byBib===before.join(',')) throw new Error('推估順序恰好等於號碼布序，測不出差異');
});
t('★ 有紀錄者排在無紀錄者之前', ()=>{
  groups.forEach(g=>{
    const firstNo=g.athletes.findIndex(a=>a.noData);
    if(firstNo===-1) return;
    const after=g.athletes.slice(firstNo);
    if(after.some(a=>!a.noData)) throw new Error(g.name+' 無紀錄者之後仍有有紀錄者');
  }); });
t('至凱 的推估排序在第 9 位（16 人中）', ()=>{
  const i=g0.athletes.findIndex(a=>a.bib==='1035');
  eq(i,8,'index'); eq(g0.athletes[0].bib,'2273','推估第 1 應為鄭瑀鎧'); });
t('掉隊時不顯示「再拿 1 分」（會與「這場結束了」矛盾）', ()=>{ reset();
  set({'2273':6,'1494':4,'1186':2,'2204':2,'2089':1,'1246':1,'1076':1,'1588':1});
  setPos('front'); if(!/再拿 1 分/.test(R())) throw new Error('前段應顯示');
  setPos('dropped'); if(/再拿 1 分/.test(R())) throw new Error('掉隊不該顯示'); });
t('得分人數是區間時，說「可能已滿」不說「已被佔滿」', ()=>{ reset();
  set({'2273':6,'1494':4,'1186':2,'2204':2,'2089':1,'1246':1,'1076':1});
  commitUncertainRound(); commitUncertainRound();   // 7 known + 4 seats → max 11
  const A=analyze(); eq(A.scorersMin,7,'下界'); if(A.scorersMax<8) throw new Error('上界應 ≥8');
  setPos('front'); const h=TX(R());
  if(!/可能已滿/.test(h)) throw new Error('應說可能已滿: '+h.slice(0,120));
  if(/名額已被 \d+ 人佔滿/.test(h)) throw new Error('不該說已佔滿: '+h.slice(0,120)); });
t('確定滿時才說「已被佔滿」', ()=>{ reset();
  set({'2273':6,'1494':4,'1186':2,'2204':2,'2089':1,'1246':1,'1076':1,'1588':1});
  setPos('front'); const h=TX(R());
  if(!/名額已被 8 人佔滿/.test(h)) throw new Error('缺: '+h.slice(0,120));
  if(/可能已滿/.test(h)) throw new Error('確定滿時不該說「可能」'); });
t('★ analyze 與畫面用同一套排序（名次不會前後不一致）', ()=>{
  const g=groups.find(x=>/^137｜/.test(x.name));
  currentGroupId=g.id; g.athletes.forEach(a=>a.score=0);
  g.history=[]; g.currentSprintIdx=0; g.starPos={}; g.focusBib=null; roundPos={};
  const A=analyze();
  // 全 0 分 → analyze 的第 1 位必須等於清單第 1 位（seed 0），而非號碼布最小者
  eq(A.stars[0].bib, g.athletes.filter(a=>a.starred)[0].bib, '焦點預設＝seed 最前的星號');
  const minBib=[...g.athletes].sort((a,b)=>parseInt(a.bib)-parseInt(b.bib))[0].bib;
  if(g.athletes[0].bib===minBib) throw new Error('seed 序恰等於號碼布序，測不出差異');
  currentGroupId=g0.id; });
// ══════ 訊號偵測層（場次 75 Heat 2 專屬 metadata）══════
const gz=groups.find(x=>/^75｜.*H2/.test(x.name));
function rz(){currentGroupId=gz.id;gz.athletes.forEach(a=>a.score=0);gz.history=[];gz.currentSprintIdx=0;gz.progressSprintIdx=0;gz.starPos={};gz.focusBib=null;roundPos={};roundT=null;roundPicks=[];}
const setz=m=>{for(const[b,v] of Object.entries(m)) gz.athletes.find(x=>x.bib===b).score=v;};
const keys=()=>detectSignals(gz,analyze()).sig.map(x=>x.key);
// 造圈速資料：t 以毫秒給
const mkLaps=(secs,from=0)=>{ gz.history=secs.map((s,i)=>({type:'round',picks:[],sprintIdx:from+i,t:1000000+secs.slice(0,i+1).reduce((a,b)=>a+b,0)*1000})); };

t('① 配分：同單位 2 人得分 → collude', ()=>{ rz();
  setz({'1494':4}); if(keys().includes('collude')) throw new Error('單獨 1 人不該觸發');
  setz({'1588':1}); if(!keys().includes('collude')) throw new Error('桃園 2 人應觸發'); });
t('① 配分：不同單位各 1 人 → 不觸發', ()=>{ rz();
  setz({'2273':4,'1076':2,'1186':1}); if(keys().includes('collude')) throw new Error('誤報'); });
t('② 保留者反悔：有 5000淘汰 的人得分 → noflinch', ()=>{ rz();
  setz({'1076':4}); if(keys().includes('noflinch')) throw new Error('陳彥安 沒有後續賽事，不該觸發');
  setz({'2273':2}); if(!keys().includes('noflinch')) throw new Error('鄭瑀鎧 有 5000淘汰，應觸發'); });
t('② 星號選手自己得分不算反悔', ()=>{ rz();
  setz({'1035':2}); if(keys().includes('noflinch')) throw new Error('至凱 自己不該被列為反悔'); });
t('③ 巡航：A 級全 0 分且已 3 圈 → cruise', ()=>{ rz();
  setz({'1076':2}); mkLaps([22,22]);
  if(keys().includes('cruise')) throw new Error('只 2 圈不該觸發');
  mkLaps([22,22,22]);
  if(!keys().includes('cruise')) throw new Error('3 圈應觸發');
  setz({'2273':2}); if(keys().includes('cruise')) throw new Error('A 級得分後不該再說巡航'); });
t('④ 弱者跳出來：C/D 級得分且同單位有強者 → helped', ()=>{ rz();
  setz({'2081':1}); if(!keys().includes('helped')) throw new Error('林霆昊(C,Elite) 同單位有郭駿燁(B) → 應觸發');
  rz(); setz({'2515':1}); if(keys().includes('helped')) throw new Error('李萬宇(D) 單槍，不該觸發'); });
t('⑤ 圈速加速：最後一圈快 2.5 秒 → surge，且優先度最高', ()=>{ rz();
  mkLaps([22,22,22,22,19.5]);
  const k=keys(); if(!k.includes('surge')) throw new Error('應觸發 surge: '+JSON.stringify(lapPace(gz)));
  eq(k[0],'surge','surge 應排第一'); });
t('⑤ 圈速放慢：最後一圈慢 2 秒 → slow', ()=>{ rz();
  mkLaps([22,22,22,22,24]); if(!keys().includes('slow')) throw new Error('應觸發 slow'); });
t('⑤ 圈速穩定 → 不報', ()=>{ rz();
  mkLaps([22,22.3,21.8,22.1,22.2]);
  const k=keys(); if(k.includes('surge')||k.includes('slow')) throw new Error('穩定不該報: '+k); });
t('⑤ 不足 4 筆不下結論', ()=>{ rz();
  mkLaps([22,22,19]); const k=keys();
  if(k.includes('surge')) throw new Error('樣本不足不該報'); });
t('⑤ 跳圈不計入圈速（漏聽跳過的情形）', ()=>{ rz();
  gz.history=[{type:'round',picks:[],sprintIdx:0,t:1000000},
             {type:'round',picks:[],sprintIdx:1,t:1022000},
             {type:'round',picks:[],sprintIdx:3,t:1066000}];  // 缺 idx 2
  const p=lapPace(gz); eq(p.length,1,'只有 0→1 可用'); eq(p[0].sec,22,'秒數'); });
t('⑤ 沒聽清楚那圈標記 shaky 且不進基準', ()=>{ rz();
  gz.history=[0,1,2,3,4].map(i=>({type:'round',picks:[],sprintIdx:i,t:1000000+i*22000,uncertain:i===2}));
  const p=lapPace(gz);
  eq(p.filter(x=>x.shaky).length,2,'idx2 與 idx3 兩筆受污染'); });
t('★ 訊號依 sev 排序，且最多顯示 3 條', ()=>{ rz();
  setz({'1494':4,'1588':1,'2273':2,'2081':1}); mkLaps([22,22,22,22,19]);
  const D=detectSignals(gz,analyze());
  const sevs=D.sig.map(x=>x.sev);
  eq(sevs.join(','),[...sevs].sort((a,b)=>b-a).join(','),'應遞減');
  if(D.sig.length<3) throw new Error('這情境應有 ≥3 條訊號');
  eq(D.sig[0].key,'surge','最高優先為 surge'); });
t('★ 其他組（無 UNIT/LATER）不會爆，也不會誤報', ()=>{
  const g2=groups.find(x=>/^139｜/.test(x.name)); currentGroupId=g2.id;
  g2.athletes.forEach(a=>a.score=0); g2.history=[]; g2.currentSprintIdx=0; g2.starPos={}; g2.focusBib=null; roundPos={};
  g2.athletes[0].score=2; g2.athletes[1].score=1;
  const D=detectSignals(g2,analyze());
  if(D.sig.some(x=>['collude','noflinch','helped'].includes(x.key)))
    throw new Error('無 metadata 的組別不該報這些: '+JSON.stringify(D.sig.map(x=>x.key)));
  currentGroupId=gz.id; });
t('★ renderAdvice 帶訊號不拋錯', ()=>{ rz();
  setz({'1494':4,'1588':1,'2081':1}); mkLaps([22,22,22,22,19]); gz.starPos={'1035':'front'};
  const el={innerHTML:''}; const REAL=document.getElementById;
  document.getElementById=()=>el; renderAdvice(); document.getElementById=REAL;
  if(!/觀測到/.test(el.innerHTML)) throw new Error('缺訊號區');
  if(!/圈速估計/.test(el.innerHTML)) throw new Error('缺圈速行'); });

console.log(''); T.forEach(([s,n])=>console.log(s,n));
const bad=T.filter(x=>x[0]==='❌').length; console.log(`\n${T.length-bad}/${T.length} 通過`); if(bad)process.exitCode=1;
