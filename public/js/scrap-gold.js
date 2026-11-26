/* Local pilot: presentation is separate from the metal category and stock code. */
(()=>{
  'use strict';let enabled=false;
  window.NexusScrapGold={get enabled(){return enabled;},open(app){
    if(!enabled||!app.currentUser||!app.hasPermission('comprar',null))return;
    let modal=document.getElementById('scrap-gold-modal');
    if(!modal){modal=document.createElement('div');modal.id='scrap-gold-modal';modal.className='modal-backdrop';modal.innerHTML='<div class="modal-card" style="width:min(1050px,95vw);max-width:1050px;max-height:90vh;overflow:auto"><div id="scrap-gold-content" style="padding:1.5rem"></div></div>';document.body.appendChild(modal);}
    const groups=NexusSafety.scrapCategoryTotals(app.data.products,app.data.categories),esc=v=>app.escapeHtml(String(v)),money=v=>app.formatCurrency(v);
    const rows=groups.flatMap(g=>[['Joyas / mercancía',g.jewelry],['Chatarra 18K',g.scrap],['Total de la categoría',g.total]].map(([label,v])=>`<tr><td>${esc(g.name)}</td><td>${label}</td><td>${esc(v.grams)} g</td><td>${money(v.value)}</td><td>${money(v.average)} / g</td></tr>`)).join('');
    const products=app.data.products.filter(NexusSafety.isScrapGold);
    document.getElementById('scrap-gold-content').innerHTML=`<div style="display:flex;justify-content:space-between;gap:1rem"><h2>Oro chatarra · piloto local</h2><button type="button" class="btn btn-secondary" id="scrap-gold-close">Cerrar</button></div><p>Oro 18K. La chatarra está incluida una sola vez en el total de su categoría. Conserva código y existencias propios.</p>${app.canPerformAction('create','purchase')?'<button type="button" class="btn btn-primary" id="scrap-gold-new">+ Comprar oro chatarra</button>':''}<div style="overflow:auto;margin-top:1rem"><table class="data-table"><thead><tr><th>Categoría</th><th>Presentación</th><th>Gramos</th><th>Valor adquirido</th><th>Promedio ponderado</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Registra una compra de chatarra para ver el desglose.</td></tr>'}</tbody></table></div><h3 style="margin-top:1rem">Existencias de chatarra</h3><div style="overflow:auto"><table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Gramos</th><th>Costo / g</th></tr></thead><tbody>${products.map(p=>`<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(NexusSafety.categoryFor(p,app.data.categories)?.name||p.category)}</td><td>${esc(p.stock)} g</td><td>${money(p.cost)}</td></tr>`).join('')||'<tr><td colspan="5">Sin existencias de chatarra.</td></tr>'}</tbody></table></div>`;
    document.getElementById('scrap-gold-close').onclick=()=>app.closeModal(modal.id);
    const button=document.getElementById('scrap-gold-new');if(button)button.onclick=()=>{app.closeModal(modal.id);app.openPurchaseModal('scrapGold');};app.openModal(modal.id);
  }};
  async function init(){try{const response=await fetch('/api/health',{cache:'no-store'}),health=await response.json();enabled=response.ok&&health.features?.scrapGold===true;for(const id of ['po-material-group','scrap-gold-open']){const element=document.getElementById(id);if(element)element.hidden=!enabled;}}catch(_){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
