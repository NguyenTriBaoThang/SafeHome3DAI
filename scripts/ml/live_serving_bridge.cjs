/* One functional request, never a benchmark. Secrets and image bytes stay off argv/logs. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'../..');
require('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
const ts=require('typescript');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,...rest);};
require.extensions['.ts']=(mod,filename)=>mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},fileName:filename}).outputText,filename);
(async()=>{
  const input=JSON.parse(fs.readFileSync(0,'utf8'));
  if(!input.imageBase64||!['bedroom','bathroom','hallway'].includes(input.room))throw Error('INVALID_INPUT');
  const {generateStructuredRoom,validateStructuredResponse,STRUCTURED_CONFIG}=require(path.join(root,'src/lib/vision/providers/structuredGemini.ts'));
  const model=process.env.GEMINI_MODEL||STRUCTURED_CONFIG.model_at_reference;
  if(!process.env.GEMINI_API_KEY)throw Error('MISSING_API_KEY');
  const started=performance.now();
  const response=await generateStructuredRoom({image:Buffer.from(input.imageBase64,'base64'),mimeType:input.mimeType,
    room:input.room,model,timeoutMs:60000});
  const payload=validateStructuredResponse(response.payload,input.room);
  process.stdout.write(JSON.stringify({status:'success',payload,model,modelVersion:response.modelVersion,
    recipeSha256:STRUCTURED_CONFIG.content_sha256,latencyMs:Math.round(performance.now()-started)}));
})().catch(()=>{process.stdout.write(JSON.stringify({status:'failed',error:'LIVE_STRUCTURED_REQUEST_FAILED'}));process.exitCode=1;});
