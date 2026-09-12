import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {root} from './export.mjs';
const folder=path.join(root,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try {
    const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=path.resolve(folder,`.${requestPath}`);
    if(!file.startsWith(`${folder}/`) && file!==folder) {res.writeHead(403).end();return;}
    if(file===folder) file=path.join(folder,'index.html');
    if(!path.extname(file)) file+='.html';
    if(!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
    res.end(await readFile(file));
  }catch {res.writeHead(404,{'Content-Type':'text/plain'}).end('Page not found');}
});
server.listen(8080,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8080'));
