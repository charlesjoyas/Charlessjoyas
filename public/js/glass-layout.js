/* Local presentation only. Adds table labels/layout attributes; never reads or writes app data,
   replaces content, clones controls, submits forms or changes business event handlers. */
(() => {
  'use strict';
  const pending=new Set(),hosts=new Map();let scheduled=false,cleanup=false;
  const allowed=table=>table instanceof HTMLTableElement&&table.closest('#app,.modal-card')&&!table.closest('#receipt-modal,.thermal-ticket-card,.thermal-ticket-wrapper');
  const set=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
  const mode=host=>{
    const width=host.clientWidth;if(!width)return;
    const layout=width<540?'stack':width<960?'cards':'table';
    for(const table of hosts.get(host)||[])if(table.isConnected)set(table,'data-glass-layout',layout);
  };
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>mode(entry.target))):null;
  const text=node=>node.textContent.replace(/\s+/g,' ').trim();
  const actionLabel=label=>/^(?:acci[oó]n(?:es)?|opciones|gesti[oó]n)(?:\s|$)/i.test(label);
  function decorate(table){
    if(!allowed(table)||!table.tHead?.rows.length)return;
    const labels=[],occupied=[];
    [...table.tHead.rows].forEach((row,r)=>{
      let column=0;
      for(const cell of row.cells){
        while((occupied[column]||0)>r)column++;
        const label=text(cell);
        for(let i=column;i<column+cell.colSpan;i++){
          labels[i]||=[];if(label&&!labels[i].includes(label))labels[i].push(label);
          occupied[i]=r+cell.rowSpan;
        }
        set(cell,'data-glass-action',actionLabel(label)?'true':'false');
        column+=cell.colSpan;
      }
    });
    if(!labels.length)return;
    table.classList.add('glass-table');set(table,'data-glass-columns',String(labels.length));
    for(const section of [...table.tBodies,...(table.tFoot?[table.tFoot]:[])]){
      const busy=[];
      [...section.rows].forEach((row,r)=>{
        let column=0;
        for(const cell of row.cells){
          while((busy[column]||0)>r)column++;
          let label=cell.colSpan===1?(labels[column]||[]).join(' / '):'';
          if(!label&&cell.colSpan===1&&cell.querySelector('button,a[href]'))label='Acciones';
          set(cell,'data-glass-label',label);set(cell,'data-glass-span',cell.colSpan>1?'true':'false');
          set(cell,'data-glass-action',actionLabel(label)?'true':'false');
          for(let i=column;i<column+cell.colSpan;i++)busy[i]=r+cell.rowSpan;
          column+=cell.colSpan;
        }
      });
    }
    const host=table.parentElement;
    host.classList.add('glass-table-host');set(host,'data-glass-host','');
    if(!hosts.has(host)){hosts.set(host,new Set());resize?.observe(host);}
    hosts.get(host).add(table);mode(host);
  }
  function flush(){
    scheduled=false;
    if(cleanup){for(const [host,tables]of hosts){for(const t of tables)if(!t.isConnected||t.parentElement!==host)tables.delete(t);if(!host.isConnected||!tables.size){resize?.unobserve(host);hosts.delete(host);}}cleanup=false;}
    const tables=[...pending];pending.clear();tables.forEach(decorate);
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(flush);}};
  const collect=node=>{
    const el=node.nodeType===1?node:node.parentElement;if(!el)return;
    const table=el.closest('table');if(table&&allowed(table))pending.add(table);
    el.querySelectorAll?.('table').forEach(t=>{if(allowed(t))pending.add(t);});
  };
  const start=()=>{
    document.querySelectorAll('table').forEach(t=>{if(allowed(t))pending.add(t);});flush();
    new MutationObserver(records=>{
      for(const record of records){
        const el=record.target.nodeType===1?record.target:record.target.parentElement;
        const table=el?.closest('table');if(table&&allowed(table))pending.add(table);
        record.addedNodes.forEach(collect);if(record.removedNodes.length)cleanup=true;
      }
      if(pending.size||cleanup)schedule();
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
    if(!resize)window.addEventListener('resize',()=>hosts.forEach((_,host)=>mode(host)),{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
