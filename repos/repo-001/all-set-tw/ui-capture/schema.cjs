const {DatabaseSync}=require("node:sqlite");const fs=require("fs");const path=require("path");
const dir=__dirname+"/state/v3/d1/miniflare-D1DatabaseObject";const f=fs.readdirSync(dir).find(x=>x.endsWith(".sqlite")&&x!=="metadata.sqlite");
const db=new DatabaseSync(path.join(dir,f));
const names=process.argv.slice(2);
for (const r of db.prepare("select name, sql from sqlite_master where type='table'").all()) if(!names.length||names.includes(r.name)) console.log(r.sql.replace(/\s+/g," "),"\n");
