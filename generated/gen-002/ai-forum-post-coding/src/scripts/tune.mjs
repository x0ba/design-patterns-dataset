const codes=['R','O','V','L','G','E','S','T','U'];
const gold={R:30,O:40,V:68,L:48,G:34,E:14,S:30,T:20,U:16};
// [goldCode, modelCode, n]
const off=[
['V','R',12],['L','R',2],['U','R',1],['R','V',2],['R','L',3],['R','U',1],['R','S',1],['R','O',1],
['O','S',3],['S','O',2],['O','L',2],['L','O',1],['V','U',3],['U','V',1],['G','T',1],['T','G',1],['E','L',1],['L','E',1],['G','L',1],['G','O',1],
];
const tot=off.reduce((a,b)=>a+b[2],0);
const req=off.filter(x=>x[0]==='R'||x[1]==='R').reduce((a,b)=>a+b[2],0);
console.log('disagreements',tot,'request-involved',req);
const N=300;
for(const c of codes){
  const g=gold[c];
  const fn=off.filter(x=>x[0]===c).reduce((a,b)=>a+b[2],0);
  const fp=off.filter(x=>x[1]===c).reduce((a,b)=>a+b[2],0);
  const m=g-fn+fp;
  const po=(N-fn-fp)/N, pe=(g*m+(N-g)*(N-m))/(N*N);
  console.log(c,'g',g,'fn',fn,'fp',fp,'kappa',((po-pe)/(1-pe)).toFixed(3));
}
