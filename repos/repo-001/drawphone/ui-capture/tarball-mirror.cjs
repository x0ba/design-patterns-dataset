// Tiny local mirror serving prefetched npm tarballs (used only for install, because the sandbox proxy drops connections)
const http=require("http"),fs=require("fs"),path=require("path");
const dir=path.join(__dirname,"tarballs");
http.createServer((req,res)=>{
  const p=decodeURIComponent(req.url.split("?")[0]).replace(/^\//,"");
  const f=p.replace("/-/","__").replace(/\//g,"_");
  const fp=path.join(dir,f);
  if(fs.existsSync(fp)){res.writeHead(200,{"content-type":"application/octet-stream"});fs.createReadStream(fp).pipe(res);}
  else{console.error("miss",req.url);res.writeHead(404);res.end();}
}).listen(5470,()=>console.log("mirror up"));
