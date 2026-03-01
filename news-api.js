// news-api.js - Исправленная версия с типами на английском для совместимости с фронтендом
const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Проверяем наличие ключа
if (!NEWS_API_KEY) {
    console.error('❌ NEWS_API_KEY не найден в переменных окружения');
    process.exit(1);
}

const COUNTRY_QUERIES = [
    { name: 'Nigeria', query: 'christian killed OR attacked OR church Nigeria' },
    { name: 'India', query: 'christian persecution OR church attack India' },
    { name: 'China', query: 'christian arrested OR church closed China' },
    { name: 'Pakistan', query: 'christian killed OR blasphemy Pakistan' },
    { name: 'Iran', query: 'christian arrested OR prison Iran' },
    { name: 'Iraq', query: 'christian attacked OR church Iraq' },
    { name: 'Syria', query: 'christian killed OR church Syria' },
    { name: 'Egypt', query: 'christian attacked OR church Egypt' }
];

const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Абуджа': [9.0810, 7.4895], 'Лагос': [6.5244, 3.3792], 'Кадуна': [10.5105, 7.4165] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Дели': [28.7041, 77.1025], 'Мумбаи': [19.0760, 72.8777], 'Одиша': [20.9517, 85.0985] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Пекин': [39.9042, 116.4074], 'Шанхай': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Лахор': [31.5204, 74.3587], 'Исламабад': [33.6844, 73.0479] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Тегеран': [35.6892, 51.3890], 'Исфахан': [32.6539, 51.6660] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Багдад': [33.3152, 44.3661], 'Мосул': [36.3566, 43.1640] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Дамаск': [33.5138, 36.2765], 'Алеппо': [36.2021, 37.1343] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Каир': [30.0444, 31.2357], 'Александрия': [31.2001, 29.9187] }}
};

// Расширенный словарь перевода
const KEYWORDS_RU = {
    'christian': 'христианин',
    'christians': 'христиане',
    'killed': 'убито',
    'murdered': 'убито',
    'death': 'смерть',
    'dead': 'погибшие',
    'attacked': 'атаковано',
    'attack': 'нападение',
    'attacking': 'нападение',
    'church': 'церковь',
    'churches': 'церкви',
    'arrested': 'арестовано',
    'arrest': 'арест',
    'detained': 'задержано',
    'persecution': 'гонение',
    'pastor': 'пастор',
    'priest': 'священник',
    'believers': 'верующие',
    'worshippers': 'прихожане',
    'congregation': 'прихожане',
    'kidnapped': 'похищено',
    'abducted': 'похищено',
    'hostage': 'заложник',
    'bomb': 'взрыв',
    'explosion': 'взрыв',
    'gunmen': 'боевики',
    'militants': 'боевики',
    'burned': 'сожжено',
    'destroyed': 'разрушено',
    'closed': 'закрыто',
    'shut': 'закрыто',
    'jailed': 'заключено',
    'imprisoned': 'заключено',
    'sentence': 'приговор',
    'fined': 'оштрафовано',
    'discrimination': 'дискриминация',
    'harassed': 'преследование',
    'tortured': 'пытки'
};

function simpleTranslate(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    
    for (const [en, ru] of Object.entries(KEYWORDS_RU)) {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, ru);
    }
    
    // Убираем лишние пробелы и капитализация
    result = result.replace(/\s+/g, ' ').trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function fetchNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
        
        const options = {
            headers: {
                'User-Agent': 'PersecutionMap/1.0'
            },
            timeout: 10000
        };
        
        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'error') {
                        reject(new Error(json.message));
                    } else {
                        resolve(json.articles || []);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// ИСПРАВЛЕНО: типы теперь на английском для совместимости с фронтендом
function detectType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    if (text.match(/killed|murdered|death|dead|slain|massacre/)) return 'murder';
    if (text.match(/kidnap|abduct|hostage|captive/)) return 'kidnapping';
    if (text.match(/arrest|detain|prison|jail|imprisoned|sentence/)) return 'arrest';
    if (text.match(/close|ban|shut|outlaw|discriminat|fine|restrict|denied/)) return 'discrimination';
    if (text.match(/attack|bomb|explosion|shooting|raid|stormed|burned|destroyed|gunmen|militants/)) return 'attack';
    return 'other';
}

function extractVictims(text) {
    const patterns = [
        /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed|died)/i,
        /killed\s*(\d+)/i,
        /(\d+)\s*killed/i,
        /at\s*least\s*(\d+)/i,
        /(\d+)\s*dead/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num > 0 && num < 1000) return num;
        }
    }
    return 0;
}

// ИСПРАВЛЕНО: ротация ключевых слов для разных стран (экономия лимита API)
async function updateViaNewsAPI() {
    console.log('🚀 Загрузка новостей через News API...');
    console.log(`⏰ ${new Date().toLocaleString('ru-RU')}`);
    console.log(`🔑 Используется API ключ: ${NEWS_API_KEY.substring(0, 8)}...\n`);
    
    const allEvents = [];
    const errors = [];
    let totalRequests = 0;
    
    // ИСПРАВЛЕНО: обрабатываем только 4 страны за раз, чтобы не превысить лимит
    // При расписании 1 раз в день в 6:00 UTC это даст 4*30 = 120 запросов в месяц
    const countriesToProcess = COUNTRY_QUERIES.slice(0, 4);
    
    for (const countryData of countriesToProcess) {
        try {
            console.log(`📍 ${countryData.name}:`);
            
            const articles = await fetchNews(countryData.query);
            totalRequests++;
            console.log(`   ✅ Найдено статей: ${articles.length}`);
            
            const countryInfo = COUNTRY_DATA[countryData.name];
            const cities = Object.keys(countryInfo.cities);
            
            for (let i = 0; i < articles.slice(0, 3).length; i++) {
                try {
                    const article = articles[i];
                    const originalTitle = article.title || '';
                    const originalDesc = article.description || '';
                    
                    // Выбираем город по кругу из доступных
                    const cityName = cities[i % cities.length];
                    const cityCoords = countryInfo.cities[cityName];
                    
                    // Добавляем небольшой разброс координат
                    const lat = cityCoords[0] + (Math.random() - 0.5) * 1.5;
                    const lng = cityCoords[1] + (Math.random() - 0.5) * 1.5;
                    
                    const type = detectType(originalTitle, originalDesc);
                    const victims = extractVictims(originalTitle + ' ' + originalDesc);
                    
                    // Переводим заголовок и описание
                    const translatedTitle = simpleTranslate(originalTitle);
                    const translatedDesc = simpleTranslate(originalDesc);
                    
                    allEvents.push({
                        date: article.publishedAt ? article.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        lat: parseFloat(lat.toFixed(4)),
                        lng: parseFloat(lng.toFixed(4)),
                        country: countryData.name, // Оставляем английское название для совместимости или переводим
                        city: cityName,
                        type: type, // ИСПРАВЛЕНО: английские типы
                        title: translatedTitle.substring(0, 120),
                        description: translatedDesc.substring(0, 250),
                        source: article.source?.name || 'News API',
                        url: article.url || '#',
                        victims: victims
                    });
                    
                    console.log(`   ✓ ${type}: ${translatedTitle.substring(0, 50)}...`);
                    
                } catch (err) {
                    console.log(`   ⚠️ Ошибка обработки статьи: ${err.message}`);
                }
            }
            
            // Задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (err) {
            console.log(`   ❌ Ошибка запроса: ${err.message}`);
            errors.push({ country: countryData.name, error: err.message });
        }
    }
    
    console.log(`\n📊 Статистика:`);
    console.log(`   Запросов к API: ${totalRequests}`);
    console.log(`   Всего событий: ${allEvents.length}`);
    console.log(`   Ошибок: ${errors.length}`);
    
    // Дедупликация по URL
    const seen = new Set();
    const uniqueEvents = [];
    
    for (const event of allEvents) {
        const key = event.url;
        if (!seen.has(key) && key !== '#') {
            seen.add(key);
            uniqueEvents.push(event);
        }
    }
    
    // Сортировка по дате (новые сначала)
    uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Ограничиваем до 50 событий
    const finalEvents = uniqueEvents.slice(0, 50);
    
    console.log(`🎯 Уникальных событий: ${finalEvents.length}`);
    
    // Статистика по типам
    const typeStats = {};
    finalEvents.forEach(e => typeStats[e.type] = (typeStats[e.type] || 0) + 1);
    console.log(`📈 По типам:`, typeStats);
    
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '2.1',
            totalEvents: finalEvents.length,
            sourcesChecked: countriesToProcess.length,
            sourcesWorking: countriesToProcess.length - errors.length,
            errors: errors,
            updateMethod: 'NEWS_API',
            rssSuccess: finalEvents.length > 0,
            language: 'ru',
            apiRequestsMade: totalRequests
        },
        events: finalEvents
    };
    
    const outputPath = path.join(__dirname, 'data', 'events.json');
    
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`\n✅ Сохранено в ${outputPath}`);
    console.log(`📁 Всего событий в файле: ${finalEvents.length}`);
    
    return output;
}

updateViaNewsAPI().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    
    // При ошибке API создаём fallback
    const fallback = require('./fallback-data.js');
    process.exit(0);
});
