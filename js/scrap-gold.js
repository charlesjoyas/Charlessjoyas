/* Local pilot: CHATARRA has its own grams, value and weighted average. */
(()=>{
  'use strict';let enabled=false;
  window.NexusScrapGold={get enabled(){return enabled;},open(app){
    if(!enabled||!app.currentUser||!app.hasPermission('comprar',null))return;
    let modal=document.getElementById('scrap-gold-modal');
    if(!modal){modal=document.createElement('div');modal.id='scrap-gold-modal';modal.className='modal-backdrop';modal.innerHTML='<div class="modal-card" style="width:min(1050px,95vw);max-width:1050px;max-height:90vh;overflow:auto"><div id="scrap-gold-content" style="padding:1.5rem"></div></div>';document.body.appendChild(modal);}
    const groups=NexusSafety.scrapCategoryTotals(app.data.products,app.data.categories),esc=v=>app.escapeHtml(String(v)),money=v=>app.formatCurrency(v);
    const rows=groups.map(g=>g.subcategories.map(s=>`<tr><td>${esc(g.name)} · ${esc(s.name)}</td><td>${esc(s.grams)} g</td><td>${money(s.value)}</td><td>${money(s.average)} / g</td></tr>`).join('')+`<tr><td><strong>Total ${esc(g.name)}</strong></td><td>${esc(g.total.grams)} g</td><td>${money(g.total.value)}</td><td>${money(g.total.average)} / g</td></tr>`).join('');
    const products=app.data.products.filter(NexusSafety.isScrapGold);
    document.getElementById('scrap-gold-content').innerHTML=`<div style="display:flex;justify-content:space-between;gap:1rem"><h2>Chatarra · categoría independiente</h2><button type="button" class="btn btn-secondary" id="scrap-gold-close">Cerrar</button></div><p>Italiano y Nacional tienen sus propios gramos y promedios dentro de CHATARRA. El total se pondera entre ambos, separado de las categorías principales. Sin restricción de quilates. El promedio representa costo de adquisición por gramo recibido.</p>${app.canPerformAction('create','purchase')?'<button type="button" class="btn btn-primary" id="scrap-gold-new">+ Comprar chatarra</button>':''}<div style="overflow:auto;margin-top:1rem"><table class="data-table"><thead><tr><th>Categoría</th><th>Gramos</th><th>Valor adquirido</th><th>Promedio propio</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Registra una compra en CHATARRA para ver sus totales.</td></tr>'}</tbody></table></div><h3 style="margin-top:1rem">Existencias de chatarra</h3><div style="overflow:auto"><table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Gramos</th><th>Costo / g</th></tr></thead><tbody>${products.map(p=>`<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc('CHATARRA · '+({italiano:'Italiano',nacional:'Nacional'}[p.scrapOrigin]||'Sin clasificar'))}</td><td>${esc(p.stock)} g</td><td>${money(p.cost)}</td></tr>`).join('')||'<tr><td colspan="5">Sin existencias de chatarra.</td></tr>'}</tbody></table></div>`;
    document.getElementById('scrap-gold-close').onclick=()=>app.closeModal(modal.id);
    const button=document.getElementById('scrap-gold-new');if(button)button.onclick=()=>{app.closeModal(modal.id);app.openPurchaseModal('scrapGold');};app.openModal(modal.id);
  }};
  async function init(){try{const response=await fetch('/api/health',{cache:'no-store'}),health=await response.json();enabled=response.ok&&health.features?.scrapGold===true;const element=document.getElementById('scrap-gold-open');if(element)element.hidden=!enabled;}catch(_){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
