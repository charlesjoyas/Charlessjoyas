/* Detect published releases. Never refresh automatically or discard a sale. */
(() => {
  'use strict';
  const loaded=document.querySelector('meta[name="nexus-release"]')?.content;
  if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(loaded||''))return;
  let latest=null,dismissed=null,checking=false,lastCheck=0;
  const element=id=>document.getElementById(id);
  const blocked=()=>{
    const current=window.app;
    if(current?.cart?.length)return 'Termina o cancela la venta en curso antes de actualizar.';
    if(current?._mutationActive||current?._isSaving)return 'Espera a que termine el guardado antes de actualizar.';
    if(current?._requiresRefresh)return 'Revisa primero el estado de la operación pendiente antes de actualizar.';
    if(document.querySelector('.modal-backdrop.open, .modal.open'))return 'Guarda tus cambios y cierra la ventana abierta antes de actualizar.';
    return '';
  };
  const render=()=>{
    const banner=element('release-update-notice');if(!banner)return;
    banner.hidden=!window.app?.currentUser||!latest||latest===dismissed;
    if(banner.hidden)return;
    const reason=blocked();element('release-update-help').textContent=reason;
    element('release-update-button').disabled=!!reason;
  };
  const check=async()=>{
    if(checking||document.visibilityState==='hidden'||Date.now()-lastCheck<15000)return;
    checking=true;lastCheck=Date.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch('/api/version',{cache:'no-store',signal:controller.signal});
      if(!response.ok)return;
      const data=await response.json();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(data.release||''))return;
      latest=data.release===loaded?null:data.release;render();
    }catch(_){/* Losing connectivity is not evidence of a new version. */}
    finally{clearTimeout(timer);checking=false;}
  };
  window.CharlesRelease={
    check,
    later:()=>{dismissed=latest;render();},
    reload:()=>{
      // Check again at click time: a sale may have started since the last render.
      if(!window.app?.currentUser||!latest)return;
      const reason=blocked();if(reason){render();window.app?.showToast(reason,'info');return;}
      window.location.reload();
    }
  };
  const start=()=>{check();setInterval(check,60000);setInterval(render,1000);};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
  window.addEventListener('focus',check);window.addEventListener('online',check);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
