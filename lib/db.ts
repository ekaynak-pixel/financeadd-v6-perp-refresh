import Database from 'better-sqlite3';import path from 'path';import slugify from 'slugify';import {gzipSync,gunzipSync} from 'zlib';import fs from 'fs';
const DB_PATH=process.env.VERCEL?path.join('/tmp','data.sqlite'):path.join(process.cwd(),'data.sqlite');let db:Database.Database;
function init(){if(!db){try{fs.mkdirSync(path.dirname(DB_PATH),{recursive:true})}catch{}db=new Database(DB_PATH);db.pragma('journal_mode = WAL');db.exec(`
CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,slug TEXT UNIQUE,title TEXT,content_compressed BLOB,created_at INTEGER);
CREATE TABLE IF NOT EXISTS searches(id TEXT PRIMARY KEY,term TEXT UNIQUE,created_at INTEGER);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
CREATE TABLE IF NOT EXISTS answers(term TEXT PRIMARY KEY,text TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS api_keys(id TEXT PRIMARY KEY,label TEXT,base_url TEXT,model TEXT,header_name TEXT,api_key TEXT,enabled INTEGER DEFAULT 1,priority INTEGER DEFAULT 10);`);}return db}
export function getDB(){return init()}
export function getSetting(key:string){const row=getDB().prepare('SELECT value FROM settings WHERE key=?').get(key);return row?row.value:null}
export function setSetting(key:string,value:string){getDB().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value)}
export function saveAnswer(term:string,text:string){getDB().prepare('INSERT OR REPLACE INTO answers(term,text,created_at) VALUES(?,?,?)').run(term,text,Date.now())}
export function getAnswer(term:string){const row=getDB().prepare('SELECT text FROM answers WHERE term=?').get(term);return row?.text||null}
export function insertSearchTerm(term:string,maxRows=20000){const db=getDB();db.prepare('INSERT OR IGNORE INTO searches(id,term,created_at) VALUES (?,?,?)').run(globalThis.crypto?.randomUUID?.()||String(Math.random()),term,Date.now());const row=db.prepare('SELECT COUNT(*) as c FROM searches').get();const over=(row.c||0)-maxRows;if(over>0){db.prepare('DELETE FROM searches WHERE rowid IN (SELECT rowid FROM searches ORDER BY created_at ASC LIMIT ?)').run(over)}}
export function ensureBlogStubForTerm(term:string,maxPosts=2000){const db=getDB();const slug=slugify(term,{lower:true,strict:true});const exists=db.prepare('SELECT slug FROM posts WHERE slug=?').get(slug);if(exists) return slug;const md=`# ${term}
_Auto-generated page for indexing._
This page shows Google results, AI summary (if available), and suggested web articles for **${term}**.`;const compressed=gzipSync(Buffer.from(md,'utf-8'));db.prepare('INSERT INTO posts(id,slug,title,content_compressed,created_at) VALUES (?,?,?,?,?)').run(globalThis.crypto?.randomUUID?.()||String(Math.random()),slug,term,compressed,Date.now());const row=db.prepare('SELECT COUNT(*) as c FROM posts').get();const over=(row.c||0)-maxPosts;if(over>0){db.prepare('DELETE FROM posts WHERE rowid IN (SELECT rowid FROM posts ORDER BY created_at ASC LIMIT ?)').run(over)}return slug}
export function decompressToString(buf?:Buffer){if(!buf) return '';try{return gunzipSync(buf).toString('utf-8')}catch{return ''}}
