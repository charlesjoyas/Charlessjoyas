/* Device opt-in only. No prompts on page load, and no offline financial cache. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  let registration,subscription,config,deviceId,owner,busy=false;
  const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const homeScreenRequired=()=> (/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))&&!navigator.standalone&&!window.matchMedia('(display-mode: standalone)').matches;
  const request=async(path,body,method='POST')=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('/api/push/'+path,{method,signal:controller.signal,headers:{'Content-Type':'application/json','X-Nexus-Client':'stabilized-v1'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo guardar la configuración.');return data;
    }finally{clearTimeout(timer);}
  };
  const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
  const selected=()=>['sales','purchases','cash'].filter(name=>byId('push-'+name)?.checked);
  const status=message=>{byId('push-status').textContent=message;};
  const controls=()=>{
    const active=!!config?.device;
    byId('push-enable').disabled=busy||!registration||!config?.enabled||!selected().length||Notification.permission==='denied';
    byId('push-enable').textContent=active?'Guardar preferencias':'Activar en este dispositivo';
    byId('push-disable').disabled=busy||!active;
    byId('push-test').disabled=busy||!active;
  };
  const refresh=async()=>{
    config=null;registration=null;deviceId=null;
    if(!app.currentUser||!supported()||homeScreenRequired())return;
    registration=await navigator.serviceWorker.register('/push-sw.js',{scope:'/',updateViaCache:'none'});
    registration=await navigator.serviceWorker.ready;
    subscription=await registration.pushManager.getSubscription();
    deviceId=subscription?await digest(subscription.endpoint):null;
    const userId=app.currentUser?.id;
    const result=await request('config'+(deviceId?'?device='+deviceId:''),null,'GET');
    if(app.currentUser?.id!==userId)return;
    config=result;owner=userId;
  };
  const render=()=>{
    for(const name of ['sales','purchases','cash']){
      const input=byId('push-'+name),allowed=config?.allowedEvents.includes(name);
      input.disabled=!allowed;input.checked=!!allowed&&(config.device?config.device.events.includes(name):true);
    }
    controls();
    if(!config?.enabled)status('Las notificaciones aún no están disponibles en este entorno.');
    else if(!config.allowedEvents.length)status('Tu perfil no tiene permisos para recibir estos avisos.');
    else if(Notification.permission==='denied')status('El permiso está bloqueado. Habilita las notificaciones de este sitio en los ajustes del navegador o del sistema.');
    else if(config.device)status('Avisos activados para tu cuenta en este dispositivo.');
    else status('Activa los avisos y acepta el permiso del sistema. No se mostrarán nombres de clientes ni importes en la pantalla bloqueada.');
  };
  window.CharlesPush={
    open:async()=>{
      app.openModal('push-notifications-modal');status('Comprobando este dispositivo…');
      ['push-enable','push-disable','push-test'].forEach(id=>byId(id).disabled=true);
      if(!supported()){status('Este navegador no admite Web Push. Prueba con una versión reciente de Safari, Chrome, Edge o Firefox.');return;}
      if(homeScreenRequired()){status('En iPhone o iPad: Safari → Compartir → Agregar a inicio. Abre Charles Joyas desde ese icono y vuelve a activar los avisos (iOS/iPadOS 16.4 o posterior).');return;}
      try{await refresh();render();}catch(error){status(error.message);}
    },
    // The actual browser subscription starts in the button event, before any await.
    enable:()=>{
      if(busy||!registration||!config?.enabled||app.currentUser?.id!==owner)return;
      const events=selected();if(!events.length)return;
      busy=true;controls();
      let pending;
      try{
        const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        pending=subscription?Promise.resolve(subscription):registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      }catch(error){pending=Promise.reject(error);}
      pending.then(async sub=>{
        if(app.currentUser?.id!==owner)throw new Error('La cuenta cambió. Abre nuevamente las notificaciones.');
        subscription=sub;deviceId=await digest(sub.endpoint);
        const result=await request('subscription',{subscription:sub.toJSON(),events,userId:owner});
        config.device={id:result.id,events:result.events};status('Avisos activados. Puedes enviar una prueba a este dispositivo.');
      }).catch(error=>status(error.name==='NotAllowedError'?'El sistema no autorizó las notificaciones. Revisa los permisos del navegador.':error.message)).finally(()=>{busy=false;controls();});
    },
    disable:async()=>{
      if(busy||!deviceId)return;busy=true;controls();
      try{await request('subscription',{id:deviceId},'DELETE');config.device=null;if(subscription)await subscription.unsubscribe();subscription=null;status('Avisos desactivados en este dispositivo.');}
      catch(error){status(error.message);}finally{busy=false;controls();}
    },
    test:async()=>{
      if(busy||!deviceId)return;busy=true;controls();
      try{await request('test',{id:deviceId});status('Prueba enviada. Revisa las notificaciones del sistema; el modo No molestar puede silenciarlas.');}
      catch(error){status(error.message);}finally{busy=false;controls();}
    },
    changed:controls,
    device:()=>deviceId,
    reset:()=>{config=null;owner=null;},
    prepare:()=>{refresh().catch(()=>{});}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(app.currentUser)window.CharlesPush.prepare();});
})();
