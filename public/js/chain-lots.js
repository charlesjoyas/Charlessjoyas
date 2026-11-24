/* Local pilot only. All receipts use the ordinary purchase order form. */
(function () {
  'use strict';
  let enabled = false;
  window.NexusChainLots = {
    get enabled() { return enabled; },
    open(app) {
      if (!enabled || !app.currentUser) return;
      let modal = document.getElementById('chain-lots-modal');
      if (!modal) {
        modal = document.createElement('div'); modal.id = 'chain-lots-modal'; modal.className = 'modal-backdrop';
        modal.innerHTML = '<div class="modal-card" style="width:min(960px,95vw);max-width:960px;max-height:90vh;overflow:auto"><div id="chain-lots-content" style="padding:1.5rem"></div></div>';
        document.body.appendChild(modal);
      }
      const canBuy = app.canPerformAction('create','purchase');
      const canSell = app.hasPermission('pos',null);
      const esc = value => app.escapeHtml(value);
      const lots = app.data.products.filter(NexusSafety.isChainLot);
      document.getElementById('chain-lots-content').innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:1rem"><h2>Lotes de cadenas</h2><button type="button" class="btn btn-secondary" id="chain-lots-close">Cerrar</button></div>
        <p>Los lotes ingresan mediante órdenes de compra. Cada venta descuenta cadenas completas y su peso real.</p>
        ${canBuy?'<button type="button" class="btn btn-primary" id="chain-lots-new-order">+ Nueva Orden de Compra por Lote</button>':''}
        <div style="overflow:auto;margin-top:1rem"><table class="data-table" style="width:100%"><thead><tr><th>Lote / código</th><th>Referencia</th><th>Cadenas</th><th>Gramos</th>${canBuy?'<th>Costo/g</th>':''}<th></th></tr></thead><tbody>
          ${lots.map((p,index)=>`<tr><td>${esc(p.lotCode)}<br><small>${esc(p.sku)}</small></td><td>${esc(p.name)}</td><td>${p.stockUnits}</td><td>${esc(p.stock)} g</td>${canBuy?`<td>${app.formatCurrency(p.cost)}</td>`:''}<td>${canSell&&p.stock>0&&p.status!=='inactive'?`<button type="button" class="btn btn-primary" data-lot-index="${index}">Vender</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Aún no hay lotes.</td></tr>'}
        </tbody></table></div>`;
      document.getElementById('chain-lots-close').onclick = () => app.closeModal(modal.id);
      const newOrder=document.getElementById('chain-lots-new-order');
      if(newOrder)newOrder.onclick=()=>{app.closeModal(modal.id);app.openPurchaseModal('chainLot');};
      modal.querySelectorAll('[data-lot-index]').forEach(button => { button.onclick = () => {
        const p=lots[Number(button.dataset.lotIndex)];app.closeModal(modal.id);app.switchView('pos');app.openAddToCartModal(p.id);
      }; });
      app.openModal(modal.id);
    }
  };
  async function init(){
    try{
      const res=await fetch('/api/health',{cache:'no-store'}),health=await res.json();
      enabled=res.ok&&health.features?.chainLots===true&&health.storageMode==='Local JSON';
      const button=document.getElementById('chain-lots-open');if(button)button.hidden=!enabled;
      const option=document.getElementById('po-chain-lot-option');if(option){option.hidden=!enabled;option.disabled=!enabled;}
    }catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
