'use strict';
// In-memory Mongo update semantics for isolated storage tests. No database connection.
function applyUpdate(original,update){
 const doc=structuredClone(original);
 const parent=path=>{const parts=path.split('.'),last=parts.pop();let value=doc;for(const part of parts){if(value[part]===undefined)value[part]={};value=value[part];}return {value,last};};
 for(const [path,next]of Object.entries(update.$set||{})){const {value,last}=parent(path);value[last]=structuredClone(next);}
 for(const path of Object.keys(update.$unset||{})){const {value,last}=parent(path);delete value[last];}
 for(const [path,change]of Object.entries(update.$push||{})){const {value,last}=parent(path);value[last]||=[];const items=structuredClone(change.$each);if(change.$position===undefined)value[last].push(...items);else value[last].splice(change.$position,0,...items);}
 return doc;
}
module.exports={applyUpdate};
