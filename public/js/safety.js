/* Shared, deterministic inventory rules. No storage or network access. */
(function (root) {
  'use strict';
  const factor = unit => ({ kg: 1000, mg: 0.001, 'µg': 0.000001, ug: 0.000001, oz: 28.3495 }[String(unit || 'g').toLowerCase()] || 1);
  const round = (value, decimals = 6) => Math.round((Number(value) + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
  const weight = p => Number(p.pieceWeight ?? p.weight ?? 0);
  const isPesaje = p => (p.measureType || 'Pesaje') === 'Pesaje';
  const sku = value => String(value || '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
  function categoryFor(product, categories = []) {
    const normalize = value => String(value || '').trim().toLowerCase();
    return categories.find(c => normalize(c.id) === normalize(product.category))
      || categories.find(c => normalize(c.name) === normalize(product.category) || normalize(c.name) === normalize(product.categoryName));
  }
  const isExtraCategory = category => !!(category?.isExtra || category?.type === 'extras' || category?.inventoryScope === 'extra');
  const isExtraInventory = (product, categories = []) => {
    const category = categoryFor(product, categories);
    return !!(product.isExtra || isExtraCategory(category));
  };
  // Physical quantity and valuation remain independent from the reporting group.
  function physicalGrams(product) {
    if (product.isExtra) return 0;
    const stock = Math.max(0, Number(product.stock) || 0);
    return round(isPesaje(product) ? stock * factor(product.weightUnit || product.unit) : stock * weight(product));
  }
  function productValue(product) {
    const stock = Math.max(0, Number(product.stock) || 0), cost = Math.max(0, Number(product.cost) || 0);
    return round(!isPesaje(product) && !product.isExtra && weight(product) > 0 ? stock * weight(product) * cost : stock * cost, 2);
  }
  function inventoryMetrics(products = [], categories = []) {
    let generalValue = 0, extraValue = 0, grams = 0, metalValue = 0, generalCodes = 0;
    const groups = new Map();
    for (const product of products) {
      const value = productValue(product), physical = physicalGrams(product);
      if (isExtraInventory(product, categories)) {
        extraValue += value;
        const category = categoryFor(product, categories), grouped = isExtraCategory(category), key = grouped ? category.id : 'product:'+product.id;
        if (!groups.has(key)) groups.set(key, { id:key, name:grouped ? category.name : product.name || 'Extra individual', value:0, grams:0, units:0, products:0 });
        const group = groups.get(key);group.value += value;group.grams += physical;group.products++;
        if (!isPesaje(product)) group.units += Math.max(0, Number(product.stock) || 0);
      } else {
        generalValue += value;grams += physical;generalCodes++;
        if (isPesaje(product) || physical > 0) metalValue += value;
      }
    }
    const extrasByCategory = [...groups.values()].map(group => ({ ...group, value:round(group.value,2), grams:round(group.grams), units:round(group.units), averageCostPerGram:group.grams>0?round(group.value/group.grams,2):0, averageCostPerUnit:group.units>0?round(group.value/group.units,2):0 }));
    return { inventoryValue:round(generalValue+extraValue,2), generalInventoryValue:round(generalValue,2), extrasInventoryValue:round(extraValue,2), totalGrams:round(grams), avgCostGrams:round(grams), avgCostPerGram:grams>0?Math.round(metalValue/grams):0, skusCount:products.length, generalSkusCount:generalCodes, extrasByCategory };
  }
  const isScrapGold = p => p?.materialForm === 'scrapGold';
  const validScrapWeight = (value, allowZero = false) => typeof value==='number'&&Number.isFinite(value)&&(allowZero&&value===0||value>=0.000001)&&Number.isFinite(round(value))&&Math.abs(round(value)-value)<=1e-9;
  const parseGramInput = raw => /^\d+(?:[.,]\d{1,6})?$/.test(String(raw??'').trim())?Number(String(raw).trim().replace(',','.')):NaN;
  function scrapCategoryTotals(products = [], categories = []) {
    return categories.filter(c=>products.some(p=>isScrapGold(p)&&categoryFor(p,categories)?.id===c.id)).map(c=>{
      const members=products.filter(p=>isScrapGold(p)&&categoryFor(p,categories)?.id===c.id);
      const total=list=>{const grams=round(list.reduce((s,p)=>s+physicalGrams(p),0)),value=round(list.reduce((s,p)=>s+productValue(p),0),2);return {grams,value,average:grams>0?round(value/grams,2):0};};
      const subcategories=['italiano','nacional'].map(id=>({id,name:id==='italiano'?'Italiano':'Nacional',...total(members.filter(p=>p.scrapOrigin===id))}));
      const unclassified=members.filter(p=>!['italiano','nacional'].includes(p.scrapOrigin));
      if(unclassified.length)subcategories.push({id:'unclassified',name:'Sin clasificar (anterior)',...total(unclassified)});
      return {id:c.id,name:c.name,total:total(members),subcategories};
    });
  }
  function replenishment(product, quantity, costPerGram, pieceWeight) {
    const current = Number(product.stock) || 0;
    const pesaje = isPesaje(product);
    if (![quantity, costPerGram].every(Number.isFinite) || quantity <= 0 || costPerGram < 0) throw Object.assign(new Error('Cantidad o costo de compra inválido.'), {status:422, code:'INVALID_PURCHASE_AMOUNT'});
    if (!pesaje && current > 0 && weight(product) > 0 && pieceWeight > 0 && Math.abs(weight(product) - pieceWeight) > 0.000001) {
      throw Object.assign(new Error('El peso por pieza es diferente al stock existente. Registra esta compra con otro SKU.'), {status:422, code:'PIECE_WEIGHT_MISMATCH'});
    }
    const delta = pesaje ? quantity / factor(product.weightUnit) : quantity;
    const newCost = pesaje ? costPerGram * factor(product.weightUnit) : costPerGram;
    return { stock: round(current + delta), cost: round(((current * (Number(product.cost) || 0)) + delta * newCost) / (current + delta), 4) };
  }
  function restoreQuantity(item, product) {
    const q = Number(item.qty ?? item.quantity);
    if (!Number.isFinite(q) || q <= 0) throw new Error('Cantidad histórica inválida.');
    const oldType = item.measureType || product.measureType || 'Pesaje';
    if (oldType !== (product.measureType || 'Pesaje')) throw new Error('Cambió el tipo de medida del producto. La reversión necesita revisión manual.');
    if (isPesaje(product)) return round(q * factor(item.unit || product.weightUnit) / factor(product.weightUnit));
    const oldWeight = Number(item.pieceWeight ?? weight(product));
    if (Math.abs(oldWeight - weight(product)) > 0.000001) throw new Error('Cambió el peso por pieza. La reversión necesita revisión manual.');
    // Legacy unit sales stored gram quantities even when their unit label was u.
    return oldWeight > 0 ? round(q / oldWeight) : q;
  }
  function historicalCost(item) {
    if (Number.isFinite(item.cogsTotal) && item.cogsTotal >= 0) return item.cogsTotal;
    if (item.cost === undefined || item.cost === null || item.cost === '') return null;
    const cost = Number(item.cost);
    const q = Number(item.quantity ?? item.qty ?? 1);
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(q) || q < 0) return null;
    if ((item.measureType || 'Pesaje') === 'Pesaje') return Math.round(cost * q);
    const pw = Number(item.pieceWeight || 0);
    return Math.round(cost * q * (pw > 0 && String(item.unit).toLowerCase() !== 'g' ? pw : 1));
  }
  const isChainLot = p => p?.inventoryMode === 'chainLot';
  const lotError = message => Object.assign(new Error(message), {status:422, code:'INVALID_LOT'});
  function assertLot(product) {
    if (!isChainLot(product)) return;
    if (!isPesaje(product) || product.weightUnit !== 'g' || product.unit !== 'g' || weight(product) !== 0 || product.isExtra || !String(product.lotCode || '').trim()) throw lotError('La identidad del lote debe conservar pesaje en gramos y su código.');
    if (typeof product.stockUnits !== 'number' || !Number.isSafeInteger(product.stockUnits) || product.stockUnits < 0 || typeof product.stock !== 'number' || !Number.isFinite(product.stock) || product.stock < 0 || Math.abs(round(product.stock)-product.stock)>1e-9) throw lotError('El lote requiere unidades enteras y gramos válidos, con hasta seis decimales.');
    if ((product.stockUnits === 0) !== (product.stock === 0)) throw lotError('Las unidades y los gramos del lote deben agotarse juntos. Revisa el conteo y el peso real.');
  }
  function lotMovement(product, grams, units, direction = -1) {
    assertLot(product);
    if (!isChainLot(product) || ![-1,1].includes(direction) || typeof grams !== 'number' || !Number.isFinite(grams) || grams <= 0 || Math.abs(round(grams)-grams)>1e-9 || typeof units !== 'number' || !Number.isSafeInteger(units) || units <= 0) throw lotError('Indica gramos positivos (hasta seis decimales) y un número entero de cadenas.');
    const result = { stock: round(product.stock + direction * grams), stockUnits: product.stockUnits + direction * units };
    assertLot({ ...product, ...result });
    return result;
  }
  function lotItem(product, item) {
    if (!isChainLot(product) || item.inventoryMode !== 'chainLot' || item.lotCode !== product.lotCode || item.unit !== 'g') throw lotError('La venta no identifica el lote original.');
    return { grams: Number(item.qty ?? item.quantity), units: item.unitCount };
  }
  const api = { factor, round, weight, isPesaje, sku, replenishment, restoreQuantity, historicalCost, isChainLot, assertLot, lotMovement, lotItem, categoryFor, isExtraCategory, isExtraInventory, physicalGrams, productValue, inventoryMetrics, isScrapGold, scrapCategoryTotals, validScrapWeight, parseGramInput };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NexusSafety = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
