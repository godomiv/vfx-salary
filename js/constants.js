// ══════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════
// URL encoded — decodes at runtime only
const _x=(s,k=0x5f)=>atob(s).split('').map(c=>String.fromCharCode(c.charCodeAt(0)^k)).join('');
const CSV_URL=_x('NysrLyxlcHA7MDwscTgwMDgzOnE8MDJwLC8tOj47LDc6OisscDtwbjcFbQoQC28nZxkMGhcyNQo3AGcVGh4lFzoQMQAebDQTaCgNLS0sB2gdZhZwOicvMC0rYDkwLTI+K2I8LCl5ODY7Ym5naW1rbGptbWo=');

const LEVEL_ORDER  = ['Junior','Middle','Senior','Lead','Supervisor','Head'];
const LEVEL_COLORS = {Junior:'#4a9eff',Middle:'#00e8d3',Senior:'#ffa500',Lead:'#ff6b35',Supervisor:'#ff3366',Head:'#cc44ff'};
const EMP_COLORS   = {staff:'#00e8d3',freelance:'#ffa500',own:'#cc44ff'};
const FMT_COLORS   = {remote:'#4a9eff',hybrid:'#00ffaa',studio:'#ff6b35'};
const EMP_LABELS   = {staff:'Штатный',freelance:'Фрилансер',own:'Своя компания'};
const FMT_LABELS   = {remote:'Удалённо',hybrid:'Гибрид',studio:'В студии'};

const AGE_ORDER   = ['< 25','25-29','30-34','35-39','40-44','45+'];
const HOURS_ORDER = ['<=40','41-50','50+'];
const OT_LABELS   = {yes:'Да',no:'Нет',sometimes:'Иногда'};
const HOURS_LABELS= {'<=40':'До 40ч','41-50':'41-50ч','50+':'50+ч'};
const AGE_COLORS  = {'< 25':'#4a9eff','25-29':'#00e8d3','30-34':'#00ffaa','35-39':'#ffa500','40-44':'#ff6b35','45+':'#ff3366'};

// Global data (populated by data-loader.js from JSON files)
var CITY_COORDS = {};
var CITY_CANONICAL_MAP = {};
var CITY_ISO = {};
var COST_OF_LIVING = {};
var D = [];
var skippedCount = 0;
var mySalary = 0;
