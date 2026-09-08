import { createHash } from 'node:crypto';

export const PROGRAM_FIELDS = ['name', 'slug', 'description', 'durationDays', 'category', 'status'];
export const LESSON_FIELDS = ['day', 'title', 'concept', 'exercisePrompt', 'guidanceTemplate', 'isVoiceDay', 'order'];
const CATEGORIES = new Set(['emotional-mastery','building-presence','relationships','mindfulness','self-awareness','zen-philosophy','stoicism']);
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
export const gitBlobSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

export function validateCatalog(catalog) {
  if (catalog?.format !== 'mirrored-recovered-catalog-v2' || !Array.isArray(catalog.programs) || !catalog.programs.length) throw new Error('CATALOG_FORMAT');
  const slugs = new Set();
  for (const { program, lessons } of catalog.programs) {
    if (!program || !/^[a-z0-9-]+$/.test(program.slug ?? '') || slugs.has(program.slug)) throw new Error('CATALOG_SLUG');
    slugs.add(program.slug);
    if (Object.keys(program).some(k=>!PROGRAM_FIELDS.includes(k))) throw new Error('CATALOG_PROGRAM_FIELDS');
    if (!Number.isSafeInteger(program.durationDays) || program.durationDays<1 || program.durationDays>90 || !CATEGORIES.has(program.category) || program.status!=='active') throw new Error('CATALOG_PROGRAM_METADATA');
    if (!Array.isArray(lessons) || lessons.length !== program.durationDays) throw new Error('CATALOG_INCOMPLETE_LESSONS');
    const days = new Set();
    for (const lesson of lessons) {
      if (Object.keys(lesson).some(k=>!LESSON_FIELDS.includes(k))) throw new Error('CATALOG_LESSON_FIELDS');
      if (!Number.isSafeInteger(lesson.day) || lesson.day<1 || lesson.day>program.durationDays || days.has(lesson.day) || lesson.order!==lesson.day) throw new Error('CATALOG_LESSON_DAY');
      if (typeof lesson.isVoiceDay !== 'boolean') throw new Error('CATALOG_VOICE_DAY');
      days.add(lesson.day);
      for (const field of ['title','concept','exercisePrompt','guidanceTemplate']) if (typeof lesson[field]!=='string' || !lesson[field].trim()) throw new Error('CATALOG_LESSON_CONTENT');
    }
    for (const field of ['name','slug','description','category','status']) if (typeof program[field]!=='string' || !program[field].trim()) throw new Error('CATALOG_PROGRAM_CONTENT');
  }
  return catalog;
}

/** Pure planner. Existing rows are never updated or deleted. IDs are target-owned. */
export function planRestore(catalog, existing, databaseIdentity) {
  validateCatalog(catalog);
  if (typeof databaseIdentity!=='string' || !databaseIdentity) throw new Error('DATABASE_IDENTITY_REQUIRED');
  const actions = [], conflicts = [];
  for (const item of catalog.programs) {
    const rows = existing.filter(x=>x.program.slug===item.program.slug);
    if (rows.length>1) { conflicts.push({slug:item.program.slug, reason:'DUPLICATE_SLUG'}); continue; }
    if (!rows.length) { actions.push({kind:'insertProgram',slug:item.program.slug,program:item.program,lessons:item.lessons}); continue; }
    const row=rows[0];
    const mismatch=PROGRAM_FIELDS.filter(f=>row.program[f]!==item.program[f]);
    if (mismatch.length) conflicts.push({slug:item.program.slug,reason:'PROGRAM_DIFFERS',fields:mismatch});
    const byDay = new Map();
    for (const lesson of row.lessons) {
      if (byDay.has(lesson.day)) conflicts.push({slug:item.program.slug,day:lesson.day,reason:'DUPLICATE_DAY'});
      byDay.set(lesson.day,lesson);
    }
    const expectedDays=new Set(item.lessons.map(x=>x.day));
    for (const lesson of row.lessons) if (!expectedDays.has(lesson.day)) conflicts.push({slug:item.program.slug,day:lesson.day,reason:'UNEXPECTED_LESSON'});
    for (const lesson of item.lessons) {
      const present=byDay.get(lesson.day);
      if (!present) { actions.push({kind:'insertLesson',slug:item.program.slug,programId:row.program.id,lesson}); continue; }
      const fields=LESSON_FIELDS.filter(f=>present[f]!==lesson[f]);
      if (fields.length) conflicts.push({slug:item.program.slug,day:lesson.day,reason:'LESSON_DIFFERS',fields});
    }
  }
  const basis={catalogHash:digest(catalog),databaseIdentity,existingHash:digest(existing),actions,conflicts};
  return {...basis,planHash:digest(basis),status:conflicts.length?'HOLD_CONFLICT':actions.length?'READY_FOR_REVIEW':'NO_CHANGE'};
}

/** Parse only literal INSERT VALUES statements. Never execute archived SQL. */
export function parseLiteralInserts(query) {
  const tokens=[];let i=0;
  while(i<query.length) {
    const c=query[i];if(/\s/.test(c)){i++;continue;}
    if('(),;'.includes(c)){tokens.push({kind:c,value:c});i++;continue;}
    if(c==='\'' || c==='`'){
      const quote=c;let value='';i++;let closed=false;
      while(i<query.length){const ch=query[i++];if(ch===quote){if(query[i]===quote){value+=quote;i++;}else{closed=true;break;}}else if(ch==='\\'&&quote==='\''){const n=query[i++];const escapes={'0':'\0',n:'\n',r:'\r',t:'\t',b:'\b',Z:'\x1a'};if(n===undefined)throw new Error('SQL_ESCAPE');value+=escapes[n]??n;}else value+=ch;}
      if(!closed)throw new Error('SQL_STRING');tokens.push({kind:quote==='`'?'word':'literal',value});continue;
    }
    const number=query.slice(i).match(/^-?\d+(?:\.\d+)?/);if(number){tokens.push({kind:'literal',value:Number(number[0])});i+=number[0].length;continue;}
    const word=query.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);if(word){tokens.push({kind:'word',value:word[0]});i+=word[0].length;continue;}
    throw new Error('SQL_UNSUPPORTED_TOKEN');
  }
  let p=0;const peek=()=>tokens[p];const consume=(kind,value)=>{const t=tokens[p++];if(!t||t.kind!==kind||(value&&String(t.value).toUpperCase()!==value))throw new Error('SQL_UNSUPPORTED_GRAMMAR');return t.value;};const out=[];
  while(p<tokens.length){consume('word','INSERT');if(String(peek()?.value).toUpperCase()==='IGNORE')consume('word','IGNORE');consume('word','INTO');const table=consume('word');if(!['growth_programs','program_lessons'].includes(table))throw new Error('SQL_TABLE_NOT_ALLOWED');consume('(');const columns=[consume('word')];while(peek()?.kind===','){consume(',');columns.push(consume('word'));}consume(')');consume('word','VALUES');
    do {if(peek()?.kind===',')consume(',');consume('(');const values=[];do{if(values.length)consume(',');const t=peek();if(t?.kind==='literal'){values.push(consume('literal'));}else if(t?.kind==='word'&&String(t.value).toUpperCase()==='NULL'){consume('word','NULL');values.push(null);}else throw new Error('SQL_NONLITERAL_VALUE');}while(peek()?.kind===',');consume(')');if(values.length!==columns.length)throw new Error('SQL_COLUMN_COUNT');out.push({table,row:Object.fromEntries(columns.map((k,index)=>[k,values[index]]))});}while(peek()?.kind===',');consume(';');
  }
  return out;
}
