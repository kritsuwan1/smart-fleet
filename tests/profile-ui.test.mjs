import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';

const dir=await mkdtemp(join(tmpdir(),'fleet-profile-'));
try{
 const file=join(dir,'profile.cjs');
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Profile,{PasswordForm,PasswordField} from './src/ProfilePanel';export * from './src/profile-ui';export {passwordChangedPage} from './src/auth-pages';export const profile=p=>renderToStaticMarkup(<Profile {...p}/>);export const form=()=>renderToStaticMarkup(<PasswordForm onBack={()=>{}}/>);export const field=p=>renderToStaticMarkup(<PasswordField {...p}/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:file,bundle:true,platform:'node',format:'cjs',jsx:'automatic',nodePaths:[resolve('node_modules')],logLevel:'silent'});
 const {passwordFeedback,changeOwnPassword,profile,form,field,passwordChangedPage}=createRequire(import.meta.url)(file);
 assert.equal(passwordFeedback('12345','12345').validLength,false);
 assert.deepEqual(passwordFeedback('123456','123456'),{validLength:true,matches:true});
 assert.equal(passwordFeedback('123456','').matches,false);assert.equal(passwordFeedback('a'.repeat(129),'a'.repeat(129)).validLength,false);
 let requests=0;
 const send=async(url,options)=>{requests++;assert.equal(url,'/api/profile/password');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{currentPassword:'old-password',password:'123456'});return Response.json({success:true});};
 assert.equal((await changeOwnPassword('old-password','123456','different',send)).ok,false);assert.equal(requests,0);
 assert.equal((await changeOwnPassword('','123456','123456',send)).ok,false);assert.equal(requests,0);
 assert.equal((await changeOwnPassword('old-password','123456','123456',send)).ok,true);assert.equal(requests,1);
 const rejected=await changeOwnPassword('old-password','123456','123456',async()=>Response.json({error:'รหัสผ่านปัจจุบันไม่ถูกต้อง'},{status:400}));assert.equal(rejected.ok,false);assert.match(rejected.error,/ปัจจุบัน/);
 const expired=await changeOwnPassword('old-password','123456','123456',async()=>Response.json({error:'UNAUTHORIZED'},{status:401}));assert.equal(expired.status,401);assert.equal(expired.ok,false);
 assert.equal((await changeOwnPassword('old-password','123456','123456',async()=>new Response('<html>error</html>',{status:502}))).ok,false);
 assert.equal((await changeOwnPassword('old-password','123456','123456',async()=>Response.json({success:false}))).ok,false);
 const offline=await changeOwnPassword('old-password','123456','123456',async()=>{throw Error('offline');});assert.equal(offline.ok,false);assert.equal(offline.status,0);
 const user={id:'employee',username:'somchai',name:'สมชาย <script>',role:'employee',driverId:'person',passwordVersion:1};
 const member=profile({user});assert.match(member,/สมชาย &lt;script&gt;/);assert.match(member,/เปลี่ยนรหัสผ่าน/);assert.match(member,/method="post"/);assert.doesNotMatch(member,/APP_PASSWORD/);
 const root=profile({user:{...user,id:'admin',role:'admin'}});assert.match(root,/APP_PASSWORD/);assert.doesNotMatch(root,/account-action-row/);
 const fields=form();assert.equal((fields.match(/type="password"/g)||[]).length,3);assert.match(fields,/autocomplete="current-password"/i);assert.match(fields,/autocomplete="new-password"/i);assert.match(fields,/minlength="6"/i);assert.match(fields,/ต้องเข้าสู่ระบบอีกครั้ง/);
 const masked=field({name:'sample',label:'รหัสผ่าน',value:'',onChange(){},autoComplete:'current-password'});assert.match(masked,/type="password"/);assert.match(masked,/type="button"/);assert.match(masked,/แสดงรหัสผ่าน/);
 const success=passwordChangedPage();assert.match(success,/เปลี่ยนรหัสผ่านสำเร็จ/);assert.match(success,/href="\/login"/);assert.doesNotMatch(success,/<input|passwordHash|sessionKey/);
 console.log('PASS profile UI: six-character passwords, matching/length hints, no request on invalid input, request payload, server rejection/expired/offline/malformed responses, masked fields, root-admin path, safe profile text and signed-out success page.');
}finally{await rm(dir,{recursive:true,force:true});}
