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

var ISO_COUNTRY = {
  643:'Россия',840:'США',826:'Великобритания',276:'Германия',250:'Франция',
  124:'Канада',036:'Австралия',392:'Япония',410:'Южная Корея',356:'Индия',
  196:'Кипр',268:'Грузия',398:'Казахстан',804:'Украина',112:'Беларусь',
  528:'Нидерланды',724:'Испания',380:'Италия',616:'Польша',203:'Чехия',
  756:'Швейцария',040:'Австрия',752:'Швеция',578:'Норвегия',208:'Дания',
  246:'Финляндия',620:'Португалия',792:'Турция',376:'Израиль',784:'ОАЭ',
  764:'Таиланд',360:'Индонезия',702:'Сингапур',484:'Мексика',076:'Бразилия',
  032:'Аргентина',152:'Чили',710:'ЮАР',554:'Новая Зеландия',372:'Ирландия',
  056:'Бельгия',642:'Румыния',100:'Болгария',191:'Хорватия',348:'Венгрия',
  440:'Литва',428:'Латвия',233:'Эстония',170:'Колумбия',862:'Венесуэла',
  858:'Уругвай',604:'Перу',51:'Армения',860:'Узбекистан',156:'Китай',
  158:'Тайвань',344:'Гонконг',634:'Катар',48:'Бахрейн',414:'Кувейт',
  688:'Сербия',499:'Черногория',807:'Северная Македония',705:'Словения',
  703:'Словакия'
};

// Global data (populated by data-loader.js from JSON files)
var CITY_COORDS = {};
var CITY_CANONICAL_MAP = {};
var CITY_ISO = {};
var COST_OF_LIVING = {};
var D = [];
var skippedCount = 0;
var mySalary = 0;
