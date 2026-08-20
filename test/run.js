const mkEl = () => ({ style:{ setProperty(){}, removeProperty(){} },
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  querySelectorAll:()=>[], querySelector:()=>null,
  getBoundingClientRect:()=>({top:0}), innerHTML:'', textContent:'',
  offsetWidth:0, disabled:false, dataset:{}, appendChild(){}, });
global.document = { getElementById:()=>mkEl(), querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>({ _t:'', set textContent(v){this._t=v}, get innerHTML(){return String(this._t??'')} }) };
global.navigator = {}; global.alert=()=>{};
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.setTimeout = ()=>0; global.clearTimeout = ()=>{};
const fs=require('fs');
eval(fs.readFileSync(process.argv[2],'utf8') + '\n;\n' + fs.readFileSync(process.argv[3],'utf8'));
