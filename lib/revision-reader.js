'use strict';
// A fresh small revision read is mandatory. Never serve a cached snapshot during an outage.
function createRevisionReader({metadata,full}){
  let cached=null,inflight=null;
  async function read(){
    const meta=await metadata();
    if(!meta)return null;
    const revision=meta.updatedAt;
    if(cached&&revision!=null&&cached.updatedAt===revision)return structuredClone(cached);
    if(!inflight){
      inflight=Promise.resolve().then(full).then(state=>{cached=state?structuredClone(state):null;return state;}).finally(()=>{inflight=null;});
    }
    const state=await inflight;
    // A concurrent change may have happened while the full read was in flight.
    if(revision!=null&&state?.updatedAt!==revision){
      const latest=await metadata();
      if(latest?.updatedAt!==state?.updatedAt){cached=null;return structuredClone(await full());}
    }
    return state?structuredClone(state):null;
  }
  read.committed=state=>{cached=structuredClone(state);};
  read.peek=revision=>cached&&revision!=null&&cached.updatedAt===revision?structuredClone(cached):null;
  return read;
}
module.exports={createRevisionReader};
