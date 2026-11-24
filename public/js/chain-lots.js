/* Local pilot only. Activation is confirmed by the isolated server. */
(function () {
  'use strict';
  let enabled = false;
  const decimal = value => {
    const raw = String(value || '').trim();
    if (!/^\d+(?:[.,]\d{1,6})?$/.test(raw)) throw new Error('Digita el peso sin separadores de miles y con hasta seis decimales.');
    return Number(raw.replace(',', '.'));
  };
  window.NexusChainLots = {
    async open(app) {
      if (!enabled || !app.currentUser) return;
      let modal = document.getElementById('chain-lots-modal');
      if (!modal) {
        modal = document.createElement('div'); modal.id = 'chain-lots-modal'; modal.className = 'modal-backdrop';
        modal.innerHTML = '<div class="modal-card" style="width:min(960px,95vw);max-width:960px;max-height:90vh;overflow:auto"><div id="chain-lots-content" style="padding:1.5rem"></div></div>';
        document.body.appendChild(modal);
      }
      const canBuy = app.hasPermission('dashboard','comprar');
      const canSell = app.hasPermission('pos',null);
      const esc = value => app.escapeHtml(value);
      const lots = app.data.products.filter(NexusSafety.isChainLot);
      document.getElementById('chain-lots-content').innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:1rem"><h2>Lotes de cadenas · Prueba local</h2><button type="button" class="btn btn-secondary" id="chain-lots-close">Cerrar</button></div>
        <p>Un registro por lote físico. Cada venta descuenta cadenas completas y el peso real que se digite.</p>
        <div style="overflow:auto"><table class="data-table" style="width:100%"><thead><tr><th>Lote / código</th><th>Referencia</th><th>Cadenas</th><th>Gramos</th>${canBuy?'<th>Costo/g</th>':''}<th></th></tr></thead><tbody>
          ${lots.map((p,index)=>`<tr><td>${esc(p.lotCode)}<br><small>${esc(p.sku)}</small></td><td>${esc(p.name)}</td><td>${p.stockUnits}</td><td>${esc(p.stock)} g</td>${canBuy?`<td>${app.formatCurrency(p.cost)}</td>`:''}<td>${canSell&&p.stock>0&&p.status!=='inactive'?`<button type="button" class="btn btn-primary" data-lot-index="${index}">Vender</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Aún no hay lotes.</td></tr>'}
        </tbody></table></div>
        ${canBuy?`<hr><h3>Ingresar un lote nuevo</h3><p>Para otro lote físico usa otro código y otro SKU. El costo corresponde a cada gramo.</p>
        <form id="chain-lot-receipt-form"><div class="modal-grid-2">
          <label>Lote<input class="form-control" name="lotCode" required maxlength="80" placeholder="LOTE-CAD-001"></label>
          <label>SKU nuevo<input class="form-control" name="sku" required maxlength="80" placeholder="CAD-001"></label>
          <label>Referencia<input class="form-control" name="name" required maxlength="180" placeholder="Cadenas cubanas 18K"></label>
          <label>Proveedor<select class="form-control" name="supplierId" required><option value="">Seleccionar</option>${app.data.suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label>
          <label>Categoría<select class="form-control" name="category" required><option value="">Seleccionar</option>${app.data.categories.filter(c=>c.type!=='extras'&&!c.isExtra).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
          <label>Cadenas recibidas<input class="form-control" name="unitCount" type="number" min="1" step="1" required></label>
          <label>Peso total real (g)<input class="form-control" name="grams" inputmode="decimal" required placeholder="200.25"></label>
          <label>Costo por gramo (COP)<input class="form-control" name="unitCost" inputmode="numeric" required placeholder="400000"></label>
          <label style="grid-column:1/-1">Motivo / comprobante<input class="form-control" name="reason" required maxlength="1000"></label>
        </div><p>Este ingreso queda a crédito con el proveedor. Los pagos se registran en el módulo habitual.</p><p id="chain-lot-receipt-preview"></p><p id="chain-lot-receipt-error" role="alert" style="color:#dc2626"></p><button class="btn btn-primary" type="submit">Registrar lote local</button></form>`:''}`;
      document.getElementById('chain-lots-close').onclick = () => app.closeModal(modal.id);
      modal.querySelectorAll('[data-lot-index]').forEach(button => { button.onclick = () => {
        const p=lots[Number(button.dataset.lotIndex)];app.closeModal(modal.id);app.switchView('pos');app.openAddToCartModal(p.id);
      }; });
      const form=document.getElementById('chain-lot-receipt-form');
      if(form){
        let busy=false;
        const read=()=>{
          const values=Object.fromEntries(new FormData(form));
          const supplier=app.data.suppliers.find(s=>s.id===values.supplierId);
          const quantity=decimal(values.grams),unitCount=Number(values.unitCount),unitCost=app.parseMoneyInput(values.unitCost);
          if(!Number.isSafeInteger(unitCount)||unitCount<=0||quantity<=0||!Number.isFinite(unitCost)||unitCost<=0)throw new Error('Revisa unidades, peso y costo: deben ser mayores a cero.');
          return {inventoryMode:'chainLot',measureType:'Pesaje',pieceWeight:0,lotCode:values.lotCode.trim(),sku:values.sku.trim(),name:values.name.trim(),supplierId:supplier?.id,supplier:supplier?.name,category:values.category,quantity,unitCount,unitCost,paid:false,reason:values.reason.trim()};
        };
        form.addEventListener('input',()=>{
          try{const a=read();document.getElementById('chain-lot-receipt-preview').textContent=`${a.unitCount} cadenas · ${a.quantity} g · Total: ${app.formatCurrency(Math.round(a.quantity*a.unitCost*100)/100)}`;}catch(_){document.getElementById('chain-lot-receipt-preview').textContent='';}
        });
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(busy)return;
          const button=form.querySelector('button[type="submit"]');
          try{
            const args=read();
            if(app.data.products.some(p=>NexusSafety.sku(p.sku)===NexusSafety.sku(args.sku)))throw new Error('Ese SKU ya existe. Usa un SKU nuevo para este lote.');
            busy=true;button.disabled=true;
            await app.runMutation(()=>app.executeFinancialOperation('createPurchase',args));
            // runMutation reports errors itself; only clear the form after server confirmation.
            if(app.data.products.some(p=>NexusSafety.isChainLot(p)&&NexusSafety.sku(p.sku)===NexusSafety.sku(args.sku))){await window.NexusChainLots.open(app);app.showToast('Lote registrado con cadenas y gramos.','success');}
          }catch(error){document.getElementById('chain-lot-receipt-error').textContent=error.message;}
          finally{busy=false;button.disabled=false;}
        });
      }
      app.openModal(modal.id);
    }
  };
  async function init(){
    try{const res=await fetch('/api/health',{cache:'no-store'});const health=await res.json();enabled=res.ok&&health.features?.chainLots===true&&health.storageMode==='Local JSON';const button=document.getElementById('chain-lots-open');if(button)button.hidden=!enabled;}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
