'use strict';
const KEY='dex_budget_guided_beta_v1';
const $=id=>document.getElementById(id);
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const cents=v=>Math.round(Number(v)*100);
const fmt=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const newId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultState=()=>({version:1,startingCash:0,mode:'variable',nextPay:'',taxPct:25,funDaily:1650,saveDaily:0,essentialDaily:3000,bills:[],transactions:[],approvals:[],protectedTax:0,protectedEssential:0,protectedSavings:0,protectedFun:0});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||defaultState()}catch{state=defaultState()}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function totalCash(){return state.startingCash+state.transactions.reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0)}
function daysUntil(date){const a=new Date(today()+'T12:00:00'),b=new Date(date+'T12:00:00');return Math.round((b-a)/86400000)}
function horizon(){if(state.nextPay){const n=daysUntil(state.nextPay);if(n>=0)return Math.max(1,n+1)}return 7}
function funding(){const h=horizon(),due=state.bills.filter(b=>daysUntil(b.date)<h).sort((a,b)=>a.date.localeCompare(b.date));const obligations=due.map(b=>({...b,gap:Math.max(0,b.amount-b.funded)}));const billsGap=obligations.reduce((a,b)=>a+b.gap,0);const essentialGap=Math.max(0,state.essentialDaily*h-state.protectedEssential);const tax=state.protectedTax;const allocated=state.bills.reduce((a,b)=>a+b.funded,0)+tax+state.protectedEssential+state.protectedSavings+state.protectedFun;const cash=totalCash();const unassigned=cash-allocated;const shortfall=Math.max(0,billsGap+essentialGap-unassigned);const safe=Math.max(0,Math.min(state.protectedFun+Math.max(0,unassigned-billsGap-essentialGap),Math.max(0,cash-allocated+state.protectedFun)));return {h,due,obligations,billsGap,essentialGap,allocated,cash,unassigned,shortfall,safe}}
function recommend(f){const spare=Math.max(0,f.unassigned),needs=f.billsGap+f.essentialGap;const cutFun=Math.min(state.protectedFun,Math.max(0,f.shortfall));const cutSavings=Math.min(state.protectedSavings,Math.max(0,f.shortfall-cutFun));const still=Math.max(0,f.shortfall-cutFun-cutSavings);return {cutFun,cutSavings,still,needs,spare}}
function render(){const f=funding(),r=recommend(f);const isNew=!state.setupComplete&&!state.bills.length&&!state.transactions.length&&state.startingCash===0;$('startBanner').classList.toggle('hidden',!isNew);$('horizonText').textContent=isNew?'':`Planning window: next ${f.h} day${f.h===1?'':'s'}.`; $('safe').textContent=isNew?'—':fmt(f.safe);$('status').innerHTML=isNew?'<p>First, enter the money you have and your basic expenses in Plan. Dex will then show your estimated spending balance.</p>':f.unassigned<0?`<p class="critical">Approved allocations exceed tracked cash. Reconcile your balance and review allocations.</p>`:f.shortfall?`<p class="critical">${fmt(f.shortfall)} in near-term essentials is not yet covered. This needs attention, but it is a funding issue—not a personal failure.</p>`:`<p class="good">No uncovered essentials detected within the ${f.h}-day planning window, based on your entries.</p>`;if(!isNew&&!state.bills.length){$('status').innerHTML+='<p class="warning">No bills entered yet. Add rent, phone, and other obligations before relying on this estimate.</p><button class="secondary" id="quickAddBills">Add a bill</button>';$('quickAddBills').onclick=()=>{showTab('plan');showPlanSection('bills')}}
$('breakdown').innerHTML=isNew?'<p>After you set up your budget, you’ll see how much money is accounted for, what still needs funding, and what may be available.</p>':[['Tracked cash',f.cash],['Already allocated',f.allocated],['Unassigned cash',f.unassigned],['Upcoming bill gaps',f.billsGap],['Essential spending gap',f.essentialGap],['Uncovered essentials',f.shortfall]].map(([k,v])=>`<div class="row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join('');
let msg;if(isNew){msg='<p>Start with <strong>Plan</strong> to enter your existing cash and upcoming expenses. Dex will then calculate suggestions from your entries.</p><button id="goPlanFromRecommendation">Open Plan</button>'}else if(f.unassigned<0){msg=`<p class="critical">Allocations exceed tracked cash by ${fmt(-f.unassigned)}. Correct the cash balance or review approved reserves before making a new allocation.</p>`}else if(f.shortfall){msg=`<p>First consider reducing flexible allocations by ${fmt(r.cutFun+r.cutSavings)}. ${r.still?`Even after that, ${fmt(r.still)} remains unfunded. Review bill timing, expenses or income options; Dex cannot promise this gap will close.`:'This would cover the calculated gap.'}</p><div class="row"><span>Reduce fun reserve</span><b>${fmt(r.cutFun)}</b></div><div class="row"><span>Reduce optional savings</span><b>${fmt(r.cutSavings)}</b></div><div class="actions"><button id="approve" ${r.cutFun+r.cutSavings<=0?'disabled':''}>Approve adjustment</button><button class="secondary" id="later">Review later</button></div>`}else{const optional=Math.max(0,f.unassigned-f.billsGap-f.essentialGap);msg=`<p>Your essential funding plan is currently covered in this window. ${optional?`${fmt(optional)} remains unassigned after those needs. You can choose to protect some for savings or discretionary spending.`:'There is no extra unassigned cash to allocate right now.'}</p>${optional?`<div class="grid"><div><label>Protect for savings ($)</label><input id="allocateSave" type="number" min="0" max="${optional/100}" step="0.01" value="${(optional/200).toFixed(2)}"></div><div><label>Protect for fun ($)</label><input id="allocateFun" type="number" min="0" max="${optional/100}" step="0.01" value="${(optional/200).toFixed(2)}"></div></div><button id="approveAllocation">Approve allocation</button>`:''}`}
$('recommendation').innerHTML=msg;if($('goPlanFromRecommendation'))$('goPlanFromRecommendation').onclick=()=>showTab('plan');
if($('approve'))$('approve').onclick=()=>{const now=funding(),next=recommend(now);state.protectedFun-=next.cutFun;state.protectedSavings-=next.cutSavings;state.approvals.unshift({date:new Date().toISOString(),note:`Released ${fmt(next.cutFun)} fun and ${fmt(next.cutSavings)} optional savings for essentials`,undo:{fun:next.cutFun,savings:next.cutSavings}});persist()};
if($('later'))$('later').onclick=()=>alert('No changes made. You can review this recommendation any time.');
if($('approveAllocation'))$('approveAllocation').onclick=()=>{const s=cents($('allocateSave').value),v=cents($('allocateFun').value);const now=funding();const max=Math.max(0,now.unassigned-now.billsGap-now.essentialGap);if(!Number.isSafeInteger(s)||!Number.isSafeInteger(v)||s<0||v<0||s+v>max)return alert('Amounts exceed the available allocation.');state.protectedSavings+=s;state.protectedFun+=v;state.approvals.unshift({date:new Date().toISOString(),note:`Protected ${fmt(s)} savings and ${fmt(v)} discretionary`,undo:{fun:-v,savings:-s}});persist()};
$('billsList').innerHTML=state.bills.map(b=>`<div class="row"><div><b>${esc(b.name)}</b><br><small>${esc(b.date)} · ${fmt(b.funded)} of ${fmt(b.amount)} protected</small></div><div><button class="secondary" data-fund="${b.id}">Fund</button> <button class="danger" data-remove="${b.id}">×</button></div></div>`).join('')||'<p>No bills added yet.</p>';
document.querySelectorAll('[data-fund]').forEach(el=>el.onclick=()=>{const b=state.bills.find(x=>x.id===el.dataset.fund);const value=prompt(`How much additional cash should be protected for ${b.name}?`,'0');if(value===null)return;const n=cents(value),f=funding();if(!Number.isSafeInteger(n)||n<0||n>b.amount-b.funded||n>f.unassigned)return alert('Enter a valid amount no greater than the unfunded bill and unassigned cash.');b.funded+=n;state.approvals.unshift({date:new Date().toISOString(),note:`Protected ${fmt(n)} for ${b.name}`});persist()});
document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{if(!confirm('Remove this bill? Its protected amount will become unassigned.'))return;state.bills=state.bills.filter(b=>b.id!==el.dataset.remove);persist()});
$('transactions').innerHTML=state.transactions.slice().reverse().map(t=>`<div class="row"><div><b>${esc(t.note||t.type)}</b><br><small>${esc(t.date)}</small></div><div><b>${t.type==='income'?'+':'−'}${fmt(t.amount)}</b> <button class="danger" data-delete="${t.id}">×</button></div></div>`).join('')||'<p>No transactions yet.</p>';
document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>{if(!confirm('Delete this transaction? This recalculates cash and may affect reserves.'))return;state.transactions=state.transactions.filter(t=>t.id!==el.dataset.delete);persist()});
$('audit').innerHTML=state.approvals.map((a,i)=>`<div class="row"><div><small>${new Date(a.date).toLocaleString()}</small><br>${esc(a.note)}</div>${a.undo?`<button class="secondary" data-undo="${i}">Undo</button>`:''}</div>`).join('')||'<p>No approved adjustments yet.</p>';
document.querySelectorAll('[data-undo]').forEach(el=>el.onclick=()=>{const a=state.approvals[Number(el.dataset.undo)];if(!a.undo)return;const nf=state.protectedFun+a.undo.fun,ns=state.protectedSavings+a.undo.savings;if(nf<0||ns<0||a.undo.fun+a.undo.savings>funding().unassigned)return alert('Cannot undo safely with current allocations.');state.protectedFun=nf;state.protectedSavings=ns;state.approvals.unshift({date:new Date().toISOString(),note:'Reversed: '+a.note});delete a.undo;persist()});
}
function fillSettings(){$('mode').value=state.mode;$('cash').value=(state.startingCash/100).toFixed(2);$('nextPay').value=state.nextPay;$('tax').value=state.taxPct;$('fun').value=(state.funDaily/100).toFixed(2);$('saveGoal').value=(state.saveDaily/100).toFixed(2);$('essential').value=(state.essentialDaily/100).toFixed(2)}
function validMoney(n){return Number.isSafeInteger(n)&&n>=0&&n<1e12}
$('record').onclick=()=>{const amount=cents($('amount').value);if(!validMoney(amount)||amount===0)return alert('Enter a valid positive amount.');const type=$('type').value;state.transactions.push({id:newId(),date:new Date().toISOString(),type,amount,note:$('note').value.slice(0,120)});if(type==='income'){const tax=Math.round(amount*state.taxPct/100);const unassigned=totalCash()-(state.bills.reduce((a,b)=>a+b.funded,0)+state.protectedTax+state.protectedEssential+state.protectedSavings+state.protectedFun);state.protectedTax+=Math.min(tax,Math.max(0,unassigned))}else{ // Spend from discretionary reserve first, then essential reserve; never reduce protected bill or tax allocations silently.
let left=amount;const fromFun=Math.min(left,state.protectedFun);state.protectedFun-=fromFun;left-=fromFun;const fromEssential=Math.min(left,state.protectedEssential);state.protectedEssential-=fromEssential;
} $('amount').value='';$('note').value='';persist();showTab('home');toast('Transaction saved. Your dashboard is updated.')};
$('saveSettings').onclick=()=>{const start=cents($('cash').value),fun=cents($('fun').value),save=cents($('saveGoal').value),tax=Number($('tax').value);if(![start,fun,save].every(validMoney)||!Number.isFinite(tax)||tax<0||tax>70)return alert('Check your amounts.');state.startingCash=start;state.setupComplete=true;state.mode=$('mode').value;state.nextPay=$('nextPay').value;state.taxPct=tax;state.funDaily=fun;state.saveDaily=save;persist();toast('Your financial basics were saved.')};
$('saveEssential').onclick=()=>{const n=cents($('essential').value);if(!validMoney(n))return alert('Enter a valid amount.');state.essentialDaily=n;persist();toast('Everyday costs saved.')};
$('addBill').onclick=()=>{const name=$('billName').value.trim(),amount=cents($('billAmount').value),funded=cents($('billFunded').value),date=$('billDate').value;if(!name||!date||!validMoney(amount)||amount===0||!validMoney(funded)||funded>amount||funded>funding().unassigned)return alert('Check bill details and available unassigned cash.');state.bills.push({id:newId(),name:name.slice(0,80),amount,funded,date});$('billName').value='';$('billAmount').value='';$('billFunded').value='0';persist();toast('Bill added to your plan.')};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dex-budget-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.version!==1||!Array.isArray(obj.transactions)||!Array.isArray(obj.bills)||!Array.isArray(obj.approvals)||!Number.isSafeInteger(obj.startingCash))throw Error('Unsupported backup');if(!confirm('Replace all current app data with this backup?'))return;state=obj;persist();fillSettings()}catch(err){alert('Could not restore backup: '+err.message)}};
$('reconcile').onclick=()=>{const actual=prompt('Enter your actual combined cash balance ($):',(totalCash()/100).toFixed(2));if(actual===null)return;const n=cents(actual);if(!validMoney(n))return alert('Invalid balance');const diff=n-totalCash();state.startingCash+=diff;state.approvals.unshift({date:new Date().toISOString(),note:`Cash reconciled by ${fmt(diff)}. Review protected allocations.`});persist()};
function showTab(tab){
  document.querySelectorAll('.app-panel').forEach(s=>s.classList.add('hidden'));
  $(tab).classList.remove('hidden');
  document.querySelectorAll('.nav-btn[data-tab]').forEach(x=>{
    const active=x.dataset.tab===tab;
    x.classList.toggle('active',active);
    if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
  });
  if(tab==='plan')fillSettings();
  window.scrollTo({top:0,behavior:'auto'});
}
function showPlanSection(which){
  document.querySelectorAll('#plan .subpanel').forEach(x=>x.classList.add('hidden'));
  $('plan-'+which).classList.remove('hidden');
  document.querySelectorAll('[data-plan]').forEach(x=>{
    const active=x.dataset.plan===which;
    x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));
  });
  $('plan-'+which).style.animation='none';void $('plan-'+which).offsetWidth;$('plan-'+which).style.animation='';
}
function showHistorySection(which){
  document.querySelectorAll('#activity .subpanel').forEach(x=>x.classList.add('hidden'));
  $('history-'+which).classList.remove('hidden');
  document.querySelectorAll('[data-history]').forEach(x=>{
    const active=x.dataset.history===which;
    x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));
  });
}
let toastTimer;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3400)}
document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>showPlanSection(b.dataset.plan));
document.querySelectorAll('[data-next-plan]').forEach(b=>b.onclick=()=>{showPlanSection(b.dataset.nextPlan);window.scrollTo({top:0,behavior:'smooth'})});
document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>showHistorySection(b.dataset.history));
$('goHomeFromPlan').onclick=()=>showTab('home');
$('homeAddIncome').onclick=()=>{showTab('add');$('type').value='income';updateEntryTip();$('amount').focus()};
$('homeAddExpense').onclick=()=>{showTab('add');$('type').value='expense';updateEntryTip();$('amount').focus()};
function updateEntryTip(){
  $('entryTip').textContent=$('type').value==='income'
    ? 'Only enter income after you receive it. Dex estimates a tax reserve using your chosen rate.'
    : 'Only enter money that you already spent. This reduces tracked cash, but does not automatically mark a bill paid.';
}
$('type').addEventListener('change',updateEntryTip);

fillSettings();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});


// UX-only onboarding. Saved financial entries and the v1 backup schema are unchanged.
const TOUR_KEY='dex_budget_walkthrough_seen_1_1';
const tourSteps=[
  {tag:'WELCOME',title:'A budget that adjusts when life does.',body:'Dex helps you see what you have, what needs to be protected, and what your options are when income or expenses change.',preview:'<strong>The idea</strong><p>Know what needs attention, without guilt or guesswork.</p>'},
  {tag:'STEP 1 OF 3',title:'Start with the money you really have.',body:'Open Plan. Choose how you get paid, enter your actual starting cash, and add bills with due dates. You can switch between setup sections at the top. Expected pay is not money you already have.',preview:'<div class="row"><span>Income mode</span><b>Variable or regular</b></div><div class="row"><span>Starting balance</span><b>Money on hand</b></div><div class="row"><span>Bills</span><b>Amount + due date</b></div>'},
  {tag:'STEP 2 OF 3',title:'Record income and purchases.',body:'On Add, record earnings after they arrive and expenses after you pay them. Dex updates the dashboard based on what you enter.',preview:'<div class="row"><span>Income received</span><b>+$200.00</b></div><div class="row"><span>Groceries paid</span><b>−$24.00</b></div><small>Illustration only — these are not real entries.</small>'},
  {tag:'STEP 3 OF 3',title:'See the reality. Choose the response.',body:'On Home, Dex explains gaps and suggests adjustments. You can approve or review later. No bank money moves, and no plan is changed without approval.',preview:'<strong>Example:</strong><p>Rent still needs $60. Reducing optional spending could help; Dex will also show any shortfall that remains.</p><small>“Safe to spend” is only an estimate. Always check actual balances and due dates.</small>'}
];
let tourIndex=0;
const tourModal=$('tourModal');
function drawTour(){
  const s=tourSteps[tourIndex];
  $('tourCount').textContent=s.tag;
  $('tourTitle').textContent=s.title;
  $('tourBody').innerHTML=`<p>${s.body}</p><div class="illustration">${s.preview}</div>`;
  $('tourDots').innerHTML=tourSteps.map((_,i)=>`<span class="dot ${i===tourIndex?'active':''}" aria-hidden="true"></span>`).join('');
  $('tourBack').style.visibility=tourIndex===0?'hidden':'visible';
  $('tourNext').textContent=tourIndex===tourSteps.length-1?'Start my setup':'Next';
}
function openTour(){tourIndex=0;drawTour();if(!tourModal.open)tourModal.showModal()}
function finishTour(goToPlan){localStorage.setItem(TOUR_KEY,'1');tourModal.close();if(goToPlan){showTab('plan');showPlanSection('basics')}}
$('tourBack').onclick=()=>{tourIndex=Math.max(0,tourIndex-1);drawTour()};
$('tourNext').onclick=()=>{if(tourIndex<tourSteps.length-1){tourIndex++;drawTour()}else finishTour(true)};
$('tourSkip').onclick=()=>finishTour(false);
tourModal.addEventListener('close',()=>localStorage.setItem(TOUR_KEY,'1'));
$('openTour').onclick=openTour;
$('startTour').onclick=openTour;
$('replayTour').onclick=openTour;
$('startSetup').onclick=()=>showTab('plan');
const helpTopics={
  safe:['Estimated safe to spend','Dex estimates money potentially available after allocations you have protected and essential needs inside its planning window. It is not your account balance and not a guarantee that all future bills are covered.'],
  record:['Record what happened','Select Income received only for money you actually got. Select Expense paid when money left your account. This changes tracked cash; it does not move real funds or automatically pay a bill.'],
  funding:['Current funding picture','Tracked cash is what you entered plus income minus expenses. Allocated cash is what you already set aside in Dex. Unassigned cash may still be needed for bills. A funding gap means an obligation is not fully covered in the current plan.'],
  recommend:['Dex recommends','Dex proposes an adjustment when something changes. It does not modify your approved allocations until you tap Approve. If a gap remains after the suggestion, Dex shows it instead of claiming everything is fine.'],
  incomeMode:['How you get paid','Variable is for unpredictable deposits, like gig work. Regular modes describe weekly, biweekly, twice-monthly, or monthly pay. This beta records the choice, but does not yet automatically forecast paychecks.'],
  cash:['Starting cash','Enter the money you already have across accounts you want Dex to track. Do not count expected future earnings. This is a one-time baseline; use Activity → Reconcile cash for corrections later.'],
  tax:['Tax reserve','Dex sets aside your selected percentage of newly recorded income in its planning ledger. It is only an estimate, not a tax calculation or money automatically transferred to a tax account.'],
  bills:['Upcoming bills','Enter each bill amount and next due date. “Already protected” means money you have assigned to it in Dex. This beta does not automatically match a bill payment or advance recurring due dates; update the bill manually after paying.']
};
function openHelp(topic){const x=helpTopics[topic];if(!x)return;$('infoTitle').textContent=x[0];$('helpBody').textContent=x[1];$('infoModal').showModal()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-help]');if(el)openHelp(el.dataset.help)});
$('closeInfo').onclick=()=>$('infoModal').close();
if(!localStorage.getItem(TOUR_KEY)){openTour()}
