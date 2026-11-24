const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync(process.argv[2],'utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const ctx={console,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=()=>[anciennete('2011-05-01','2026-11-16'),anciennete('2026-11-16','2026-11-16'),anciennete('2026-01-31','2026-03-01'),anciennete('2025-11-16','2026-11-16')].join(' | ')`,ctx);console.log(ctx.T());
