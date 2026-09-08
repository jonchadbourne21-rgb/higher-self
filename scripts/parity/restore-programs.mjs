/** Review-only by default. Never invokes historic SQL/seed scripts. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { planRestore, validateCatalog, digest, PROGRAM_FIELDS, LESSON_FIELDS } from './catalog.mjs';
const CATALOG_HASH='fbc2eaedeca75a9e840e94d3eff98b1ab0c38079bc9290f6df8d1be3507ad85f';
const args=process.argv.slice(2);const allowed=new Set(['--catalog','--database','--expected-plan','--apply']);const opts={};
for(let i=0;i<args.length;i++){const key=args[i];if(!allowed.has(key)||Object.hasOwn(opts,key))throw new Error('INVALID_ARGUMENT');if(key==='--apply')opts[key]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('ARGUMENT_VALUE_REQUIRED');opts[key]=args[++i];}}
let conn,locked=false,inTransaction=false,commitAttempted=false;
try {
  if(!opts['--catalog']||!opts['--database'])throw new Error('CATALOG_AND_EXPECTED_DATABASE_REQUIRED');
  if(opts['--apply']&&!/^[a-f0-9]{64}$/.test(opts['--expected-plan']??''))throw new Error('EXPECTED_PLAN_REQUIRED');
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_NOT_SET');
  const catalog=validateCatalog(JSON.parse(await fs.readFile(opts['--catalog'],'utf8')));
  if(digest(catalog)!==CATALOG_HASH)throw new Error('PINNED_CATALOG_HASH_MISMATCH');
  const mysql=await import('mysql2/promise');
  conn=await mysql.createConnection({uri:process.env.DATABASE_URL,connectTimeout:10000,multipleStatements:false});
  const [[identity]]=await conn.execute('SELECT DATABASE() AS db, @@server_uuid AS serverUuid');
  if(identity.db!==opts['--database'])throw new Error('DATABASE_NAME_MISMATCH');
  const databaseIdentity=createHash('sha256').update(`${identity.serverUuid}:${identity.db}`).digest('hex');
  const [engines]=await conn.execute('SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?,?)',['growth_programs','program_lessons']);
  if(engines.length!==2||engines.some(x=>x.engine!=='InnoDB'))throw new Error('TRANSACTIONAL_CATALOG_TABLES_REQUIRED');
  if(opts['--apply']){
    const [[lock]]=await conn.execute("SELECT GET_LOCK('mirrored:catalog:parity-v1', 10) AS acquired");
    if(lock.acquired!==1)throw new Error('CATALOG_LOCK_NOT_ACQUIRED');locked=true;
    await conn.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');await conn.beginTransaction();
  }else {await conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await conn.execute('START TRANSACTION READ ONLY');}
  inTransaction=true;
  const existing=[];
  for(const {program} of catalog.programs){
    const suffix=opts['--apply']?' FOR UPDATE':'';
    const [rows]=await conn.execute(`SELECT id, name, slug, description, durationDays, category, status FROM growth_programs WHERE slug = ? ORDER BY id${suffix}`,[program.slug]);
    for(const row of rows){const [lessons]=await conn.execute(`SELECT day, title, concept, exercisePrompt, guidanceTemplate, \`order\` FROM program_lessons WHERE programId = ? ORDER BY day, id${suffix}`,[row.id]);existing.push({program:row,lessons});}
  }
  const plan=planRestore(catalog,existing,databaseIdentity);
  const summary={status:plan.status,databaseIdentity,planHash:plan.planHash,catalogHash:plan.catalogHash,programsToInsert:plan.actions.filter(x=>x.kind==='insertProgram').length,lessonsToInsert:plan.actions.reduce((n,x)=>n+(x.kind==='insertProgram'?x.lessons.length:1),0),conflicts:plan.conflicts};
  if(!opts['--apply']){await conn.rollback();inTransaction=false;console.log(JSON.stringify({...summary,mode:'DRY_RUN_NO_WRITES'},null,2));if(plan.conflicts.length)process.exitCode=2;}
  else {
    if(plan.conflicts.length)throw new Error('RESTORE_CONFLICT_REVIEW_REQUIRED');
    if(plan.planHash!==opts['--expected-plan'])throw new Error('PLAN_CHANGED_RERUN_DRY_RUN');
    for(const action of plan.actions){
      let id=action.programId;
      if(action.kind==='insertProgram'){
        const [r]=await conn.execute('INSERT INTO growth_programs (name,slug,description,durationDays,category,status) VALUES (?,?,?,?,?,?)',PROGRAM_FIELDS.map(k=>action.program[k]));
        id=r.insertId;if(!Number.isSafeInteger(id)||id<1)throw new Error('INSERT_ID_INVALID');
      }
      for(const lesson of action.kind==='insertProgram'?action.lessons:[action.lesson])await conn.execute('INSERT INTO program_lessons (programId,day,title,concept,exercisePrompt,guidanceTemplate,`order`) VALUES (?,?,?,?,?,?,?)',[id,...LESSON_FIELDS.map(k=>lesson[k])]);
    }
    const after=[];
    for(const {program} of catalog.programs){const [rows]=await conn.execute('SELECT id,name,slug,description,durationDays,category,status FROM growth_programs WHERE slug=? ORDER BY id',[program.slug]);for(const row of rows){const [lessons]=await conn.execute('SELECT day,title,concept,exercisePrompt,guidanceTemplate,`order` FROM program_lessons WHERE programId=? ORDER BY day,id',[row.id]);after.push({program:row,lessons});}}
    const verification=planRestore(catalog,after,databaseIdentity);if(verification.status!=='NO_CHANGE')throw new Error('POST_INSERT_VERIFICATION_FAILED');
    commitAttempted=true;await conn.commit();inTransaction=false;console.log(JSON.stringify({...summary,status:'RESTORE_COMMITTED',verification:'CATALOG_MATCH',applicationWorkflows:'NOT_TESTED'},null,2));
  }
}catch(error){if(inTransaction&&conn&&!commitAttempted)await conn.rollback().catch(()=>{});const code=typeof error?.code==='string'?error.code:typeof error?.message==='string'&&/^[A-Z0-9_:]+$/.test(error.message)?error.message:'RESTORE_FAILED';console.error(JSON.stringify({status:commitAttempted?'HOLD_COMMIT_OUTCOME_UNKNOWN':'HOLD',code,committed:commitAttempted?'UNKNOWN':false,...(commitAttempted?{nextAction:'Run a new read-only plan and reconcile the actual catalog before any retry.'}:{})}));process.exitCode=1;}
finally{if(locked&&conn)await conn.execute("SELECT RELEASE_LOCK('mirrored:catalog:parity-v1')").catch(()=>{});if(conn)await conn.end().catch(()=>{});}
