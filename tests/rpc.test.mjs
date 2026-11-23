import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import vm from 'node:vm';
import {readFile, mkdir, writeFile, mkdtemp, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {jsonWireRoundTrip} from './helpers/connection-contract.mjs';

const packageDir = fileURLToPath(new URL('../', import.meta.url));
const {apply} = await import(pathToFileURL(path.join(packageDir, 'lib/index.js')));
const scope = {pair:'11111111-1111-4111-8111-111111111111',from:'22222222-2222-4222-8222-222222222222',to:'33333333-3333-4333-8333-333333333333',bind:'44444444-4444-4444-8444-444444444444'};
const id = '55555555-5555-4555-8555-555555555555';
const peerBind = '66666666-6666-4666-8666-666666666666';
const sdp = 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=fingerprint:sha-256 AA:BB:CC:DD\r\n';
const tempRoot = await realpath(tmpdir());
const fixtureDir = await mkdtemp(path.join(tempRoot, 'dsh-gesture-rpc-test-'));
after(async () => {
  const target = await realpath(fixtureDir);
  assert.equal(target, fixtureDir);
  assert.equal(path.dirname(target), tempRoot);
  assert.ok(path.basename(target).startsWith('dsh-gesture-rpc-test-'));
  await rm(target, {recursive:true, force:true});
});
await mkdir(path.join(fixtureDir, 'agent-only-v1', 'provider'), {recursive:true});
await writeFile(path.join(fixtureDir, 'agent-only-v1', 'provider', 'client.json'), JSON.stringify({url:'http://127.0.0.1:45678',token:'0'.repeat(64)}));

let registration;
const marker = 'return module.exports;}});';
const clientSource = await readFile(path.join(packageDir, 'lib/client.js'), 'utf8');
assert.equal(clientSource.split(marker).length, 2, 'Unique module return for test-only closure access');
const sandbox = {window:{__ModuleLoader__:{load(value){registration=value;}}},AbortSignal,crypto:globalThis.crypto,console,setTimeout,clearTimeout,setInterval,clearInterval};
vm.runInNewContext(clientSource.replace(marker, 'return Object.assign(module.exports,{__test:{DualLink}});}});'), sandbox, {filename:path.join(packageDir,'lib/client.js')});
const {__test:{DualLink}} = registration.factory(name=>{assert.equal(name,'react'); return {createElement(){return null;}};});
function payload(type) { return {type,sdp,id,...scope,...type==='answer'?{forBind:peerBind}:{}}; }
function hostFixture(useGetter=false) {
  let handler, getterReads=0;
  const peer={principal:{kind:'owner'}};
  const rpc={handle(channel,callback){assert.equal(this,rpc);assert.equal(channel,'/dsh-gesture-dual');handler=callback;return()=>{};}};
  let connection;
  if(useGetter){
    const prototype={get rpc(){assert.equal(this,connection);getterReads++;return rpc;}};
    const target=Object.assign(Object.create(prototype),{browserPeer:peer,allowsRemoteAuthorities:false});
    // A Cordis-like service proxy can hide the direct getter lookup. This is a
    // synthetic receiver/registration test, not a real Cordis Host mount.
    connection=new Proxy(target,{get(object,key,receiver){return key==='rpc'?undefined:Reflect.get(object,key,receiver);}});
  }else connection={browserPeer:peer,allowsRemoteAuthorities:false,rpc};
  const host={connection,effect(fn){fn();},get(key){if(key==='profileContext')return {dir:fixtureDir,patchPath:path.join(fixtureDir,'cordis.patch.yml')};},webServer:{register(){return()=>{};}}};
  apply({inject(keys,callback){assert.deepEqual(keys,['webServer','connection']);callback(host);}});
  assert.equal(typeof handler,'function');
  return {handler,peer,getterReads};
}
async function withFakeAgent(fn, resultOverride) {
  const previous=globalThis.fetch;
  const sent=[];
  globalThis.fetch=async (url,init)=>{
    assert.equal(url,'http://127.0.0.1:45678/agent/message');
    assert.equal(init.method,'POST');
    const body=JSON.parse(init.body);sent.push(body);
    assert.ok(body.payload.text.startsWith('DSH-GESTURE-LINK/1\n'));
    const value={committed:true,messageId:body.options.messageId,retired:false,...resultOverride};
    return Response.json({ok:true,value});
  };
  try {await fn(sent);} finally {globalThis.fetch=previous;}
}
function clientFixture(reply) {
  const calls=[];
  const connection={isLoopback:true,state:{getSnapshot(){return 'connected';}},rpc:{async call(channel,endpoint,body){calls.push({channel,endpoint,body});return typeof reply==='function'?await reply(body):reply;}}};
  const link=new DualLink(connection,{current(){return {sessionId:'synthetic-session'};}},()=>{});
  link.status=async()=>({...scope});
  return {link,calls};
}
function activeLeg(link,type) {const role=type==='offer'?'tx':'rx';const leg={role,id,sid:'synthetic-session',scope:{...scope},peerBind};link[role]=leg;return leg;}

test('Negative control: the old bare result reproduces the exact reported parser error',()=>{
  assert.throws(()=>jsonWireRoundTrip({submitted:true}),{name:'TypeError',message:'connection: invalid server-response result'});
});
for(const type of ['offer','answer'])test(`Host ${type}: actual handler returns a parser-compatible success envelope`,async()=>{
  const {handler,peer}=hostFixture();
  await withFakeAgent(async sent=>{
    const result=await handler('signal',payload(type),AbortSignal.timeout(3000),peer);
    assert.deepEqual(jsonWireRoundTrip(result),{ok:true,value:{submitted:true}});
    assert.equal(sent.length,1);
    assert.equal(JSON.parse(sent[0].payload.text.slice('DSH-GESTURE-LINK/1\n'.length)).type,type);
  });
});
test('Host resolves the prototype RPC getter with the service receiver and registers its handler',()=>{
  const {getterReads}=hostFixture(true);
  assert.equal(getterReads,1);
});
test('Host preserves owner identity checks and makes no network request for a different peer',async()=>{
  const {handler}=hostFixture();
  await withFakeAgent(async sent=>{
    await assert.rejects(handler('signal',payload('offer'),AbortSignal.timeout(3000),{principal:{kind:'owner'}}));
    assert.equal(sent.length,0);
  });
});
test('Host rejects malformed SDP before any network request',async()=>{
  const {handler,peer}=hostFixture();
  await withFakeAgent(async sent=>{
    await assert.rejects(handler('signal',{...payload('offer'),sdp:'invalid'},AbortSignal.timeout(3000),peer));
    assert.equal(sent.length,0);
  });
});
test('Host retains committed/messageId/retired checks',async()=>{
  for(const resultOverride of [{committed:false},{messageId:'different-id'},{retired:true}]){
    const {handler,peer}=hostFixture();
    await withFakeAgent(async()=>{await assert.rejects(handler('signal',payload('offer'),AbortSignal.timeout(3000),peer));},resultOverride);
  }
});
for(const type of ['offer','answer'])test(`Client ${type}: actual DualLink accepts ok/value.submitted`,async()=>{
  const {link,calls}=clientFixture({ok:true,value:{submitted:true}});
  await link.signal(activeLeg(link,type),type,sdp);
  assert.equal(calls.length,1);assert.equal(calls[0].channel,'/dsh-gesture-dual');assert.equal(calls[0].body.type,type);
});
test('Client rejects a bare legacy submitted result rather than masking a malformed response',async()=>{
  const {link}=clientFixture({submitted:true});
  await assert.rejects(link.signal(activeLeg(link,'offer'),'offer',sdp),/Dual 未接纳连接消息/);
});
test('Client preserves a structured server failure message',async()=>{
  const {link}=clientFixture({ok:false,error:{code:'test/failure',message:'synthetic signal failure',details:{}}});
  await assert.rejects(link.signal(activeLeg(link,'offer'),'offer',sdp),/synthetic signal failure/);
});
test('Client rejects missing/false submitted success acknowledgements',async()=>{
  for(const value of [{submitted:false},{}]){
    const {link}=clientFixture({ok:true,value});
    await assert.rejects(link.signal(activeLeg(link,'offer'),'offer',sdp),/Dual 未接纳连接消息/);
  }
});
test('Offer and answer round-trip through actual plugin handler + installed-parser excerpt + actual client',async()=>{
  const {handler,peer}=hostFixture();
  await withFakeAgent(async sent=>{
    const {link}=clientFixture(async body=>jsonWireRoundTrip(await handler('signal',body,AbortSignal.timeout(3000),peer)));
    for(const type of ['offer','answer'])await link.signal(activeLeg(link,type),type,sdp);
    assert.equal(sent.length,2);
  });
});
test('Display manifest resources and client version remain coherent',async()=>{
  const manifest=JSON.parse(await readFile(path.join(packageDir,'package.json'),'utf8'));
  assert.ok(clientSource.includes(`var version = "${manifest.version}";`));
  assert.equal(manifest.engines.dsh,'>=0.2.1-rc.2 <0.2.2-0 || >=0.2.2-rc.1 <0.2.3-0');
  assert.equal(manifest.exports['./icon'],'./icon.svg');
  for(const name of ['icon.svg','locale/en.json','locale/zh.json'])assert.ok((await readFile(path.join(packageDir,name))).length>0);
  assert.equal(manifest.scripts?.postinstall,undefined);
});
