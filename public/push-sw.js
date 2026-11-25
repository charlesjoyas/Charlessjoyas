'use strict';
// No fetch handler or application/data cache: financial screens always use the server.
self.addEventListener('push',event=>{
  let payload={};try{payload=event.data?.json()||{};}catch(_){}
  event.waitUntil(self.registration.showNotification(String(payload.title||'Charles Joyas').slice(0,80),{
    body:String(payload.body||'Tienes una nueva notificación. Abre la aplicación.').slice(0,240),
    icon:'/icons/app-192.png',badge:'/icons/app-192.png',tag:payload.tag||undefined,
    data:{url:'/'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing)return existing.focus();
    return self.clients.openWindow('/');
  })());
});
