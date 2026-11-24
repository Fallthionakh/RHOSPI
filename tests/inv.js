const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync('../pointview/index.html','utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const el=()=>({innerHTML:'',value:'',style:{},dataset:{},checked:false});
const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},createElement:el,body:{appendChild(){}}}};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){DB=seed(new Date());index();const o=[];for(const[k,v]of Object.entries(DB)){const s=JSON.stringify(v).length;let t=Array.isArray(v)?'arr['+v.length+'] ids='+(v.length?v.every(x=>x&&typeof x==='object'&&typeof x.id==='string'):'-'):typeof v==='object'&&v?'obj{'+Object.keys(v).length+'}':typeof v;o.push(k.padEnd(18)+t.padEnd(26)+s)}return o.join('\\n')}`,ctx);console.log(ctx.T());
