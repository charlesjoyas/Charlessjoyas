/* Device-local presentation preference. Never changes app data or submits a request. */
(() => {
  'use strict';
  const key='charles_ui_appearance_v1',root=document.documentElement;
  const classicIcon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💎</text></svg>');
  const valid=value=>value==='glass'?'glass':'classic';
  let choice='classic',status='';
  try{choice=valid(localStorage.getItem(key));}catch(_){/* Classic remains available with storage blocked. */}
  function controls(){
    document.querySelectorAll('[data-appearance-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.appearanceChoice===choice)));
    const message=document.getElementById('appearance-status');
    if(message)message.textContent=status||'Diseño actual: '+(choice==='glass'?'Glass':'Clásico')+'. Se guarda solo en este navegador.';
  }
  function apply(value,persist=false){
    const previous=choice;choice=valid(value);root.setAttribute('data-appearance',choice);
    document.querySelectorAll('link[data-appearance="glass"]').forEach(link=>{const media=choice==='glass'?'screen':'not all';if(link.media!==media)link.media=media;});
    const icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=choice==='glass'?'/icons/glass-diamond.svg':classicIcon;
    if(persist){
      try{localStorage.setItem(key,choice);status='Diseño '+(choice==='glass'?'Glass':'Clásico')+' activado en este navegador.';}
      catch(_){status='Diseño aplicado en esta pestaña. El navegador no permitió guardar la preferencia.';}
    }
    controls();
    if(previous!==choice)document.dispatchEvent(new CustomEvent('charles:appearance-change',{detail:{appearance:choice}}));
  }
  // Runs in the head, before the application and its first visible screen.
  apply(choice);
  const start=()=>{
    controls();
    document.getElementById('appearance-settings')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-appearance-choice]');
      if(button&&event.currentTarget.contains(button))apply(button.dataset.appearanceChoice,true);
    });
  };
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){status='';apply(valid(event.newValue));}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
