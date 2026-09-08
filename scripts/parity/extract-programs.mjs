import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { digest, gitBlobSha, parseLiteralInserts, validateCatalog } from './catalog.mjs';
const require=createRequire(import.meta.url);

/** Extract literals from checked source; do not import or run destructive seed scripts. */
export async function extractPrograms(sourceRoot) {
  const ts=require('typescript');
  const manifest=JSON.parse(await fs.readFile(new URL('./source-manifest.json',import.meta.url),'utf8'));
  const sources=[];
  async function load(p,expected) {
    const data=await fs.readFile(path.join(sourceRoot,p));
    if(gitBlobSha(data)!==expected)throw new Error(`SOURCE_HASH_MISMATCH:${p}`);
    sources.push({path:p,gitBlobSha:expected,sha256:digestBytes(data)});
    return data.toString('utf8');
  }
  const {createHash}=await import('node:crypto');
  const digestBytes=b=>createHash('sha256').update(b).digest('hex');
  function literal(n) {
    if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;
    if(ts.isNumericLiteral(n))return Number(n.text);
    if(n.kind===ts.SyntaxKind.TrueKeyword)return true;
    if(n.kind===ts.SyntaxKind.FalseKeyword)return false;
    if(n.kind===ts.SyntaxKind.NullKeyword)return null;
    if(ts.isArrayLiteralExpression(n))return n.elements.map(literal);
    if(ts.isObjectLiteralExpression(n)){const object={};for(const p of n.properties){if(!ts.isPropertyAssignment(p)||!(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)))throw new Error('NONLITERAL_SOURCE');object[p.name.text]=literal(p.initializer);}return object;}
    throw new Error('NONLITERAL_SOURCE');
  }
  const programs=[];
  for(const [p,hash] of Object.entries(manifest.scriptSources)) {
    const text=await load(p,hash);const source=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(source.parseDiagnostics.length)throw new Error('SOURCE_PARSE_ERROR');const values={};
    const wanted=new Set(['programName','programSlug','programDescription','durationDays','category','lessons']);
    for(const statement of source.statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(ts.isIdentifier(d.name)&&wanted.has(d.name.text))values[d.name.text]=literal(d.initializer);
    if(Object.keys(values).length!==6)throw new Error('SOURCE_CONSTANTS_MISSING');
    programs.push({program:{name:values.programName,slug:values.programSlug,description:values.programDescription,durationDays:values.durationDays,category:values.category,status:'active'},lessons:values.lessons.map(l=>({...l,order:l.day})),sourcePaths:[p]});
  }
  const identityText=await load(manifest.identitySource.path,manifest.identitySource.gitBlobSha);
  const identity=JSON.parse(identityText);const expectedQuery="SELECT id FROM growth_programs WHERE slug = '21-day-inner-voice-reset';";
  if(identity.query.trim()!==expectedQuery || identity.rows?.length!==1 || !/^\d+$/.test(String(identity.rows[0].id)))throw new Error('SOURCE_IDENTITY_AMBIGUOUS');
  const originalIdBySlug=new Map([[manifest.identitySource.slug,Number(identity.rows[0].id)]]);
  const rows=[];
  for(const [p,hash] of Object.entries(manifest.querySources)) {
    const record=JSON.parse(await load(p,hash));
    if(typeof record.query!=='string')throw new Error('SOURCE_QUERY_MISSING');
    for(const entry of parseLiteralInserts(record.query))rows.push({...entry,sourcePath:p});
  }
  for(const {row,sourcePath} of rows.filter(x=>x.table==='growth_programs')) {
    const {id,...program}=row;const originalId=id??originalIdBySlug.get(program.slug);
    if(!Number.isSafeInteger(originalId))throw new Error('SOURCE_PROGRAM_ID_MISSING');
    const lessonRows=rows.filter(x=>x.table==='program_lessons'&&x.row.programId===originalId);
    programs.push({program,lessons:lessonRows.map(x=>{const {programId,...lesson}=x.row;return lesson;}),sourcePaths:[sourcePath,...new Set(lessonRows.map(x=>x.sourcePath)),...(id?[]:[manifest.identitySource.path])]});
  }
  const allowedOriginalIds=new Set([1,...originalIdBySlug.values()]);
  if(rows.some(x=>x.table==='program_lessons'&&!allowedOriginalIds.has(x.row.programId)))throw new Error('UNMAPPED_SOURCE_LESSONS');
  programs.sort((a,b)=>a.program.slug.localeCompare(b.program.slug));
  for(const item of programs)item.lessons.sort((a,b)=>a.day-b.day);
  const catalog={format:'mirrored-recovered-catalog-v1',canonicalRepository:manifest.canonicalRepository,canonicalCommit:manifest.canonicalCommit,scope:'Recovered authored program content only; not a full database export or account-history restoration.',sources,programs,limitations:['Source scripts include prose describing voice sessions without consistently setting isVoiceDay; no flags have been inferred from prose.','Only the explicitly pinned source files are represented. No claim that they contain every record from the former database.']};
  validateCatalog(catalog);return catalog;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);const rootIndex=args.indexOf('--source-root');const outIndex=args.indexOf('--out');
  if(rootIndex<0||outIndex<0||!args[rootIndex+1]||!args[outIndex+1]||args.length!==4){console.error('Usage: node scripts/parity/extract-programs.mjs --source-root /path/to/pinned/higher-self --out /path/to/catalog.json');process.exitCode=2;}
  else try{const catalog=await extractPrograms(args[rootIndex+1]);await fs.writeFile(args[outIndex+1],JSON.stringify(catalog,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({status:'EXTRACTED_NOT_IMPORTED',programs:catalog.programs.length,lessons:catalog.programs.reduce((n,p)=>n+p.lessons.length,0),catalogHash:digest(catalog)}));}catch(e){console.error(e.message);process.exitCode=1;}
}
