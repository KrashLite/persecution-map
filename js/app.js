// news-api.js - News API с переводом через LibreTranslate
const fs = require('fs');
const path = require('path');
const https = require('https');

// ============ API КЛЮЧИ ============
const NEWS_API_KEY = process.env.NEWS_API_KEY || '6392062ebc7b41d4958f992a50bad308';

// ============ СТРАНЫ ДЛЯ ПОИСКА ============
const COUNTRY_QUERIES = [
    { name: 'Nigeria', query: 'christian killed OR attacked OR church Nigeria' },
    { name: 'India', query: 'christian persecution OR church attack India' },
    { name: 'China', query: 'christian arrested OR church closed China' },
    { name: 'Pakistan', query: 'christian killed OR blasphemy Pakistan' },
    { name: 'Iran', query: 'christian arrested OR prison Iran' },
    { name: 'Iraq', query: 'christian attacked OR church Iraq' },
    { name: 'Syria', query: 'christian killed OR church Syria' },
    { name: 'Egypt', query: 'christian attacked OR church Egypt' },
    { name: 'Eritrea', query: 'christian arrested Eritrea' },
    { name: 'North Korea', query: 'christian persecution North Korea' },
    { name: 'Turkey', query: 'christian persecution Turkey' },
    { name: 'Indonesia', query: 'christian church attacked Indonesia' },
    { name: 'Sudan', query: 'christian persecution Sudan' },
    { name: 'Ethiopia', query: 'christian killed Ethiopia' },
    { name: 'Kenya', query: 'christian attacked Kenya' }
];

// ============ ПЕРЕВОДЫ НА РУССКИЙ ============
const COUNTRY_NAMES_RU = {
    'Nigeria': 'Нигерия',
    'India': 'Индия',
    'China': 'Китай',
    'Pakistan': 'Пакистан',
    'Iran': 'Иран',
    'Iraq': 'Ирак',
    'Syria': 'Сирия',
    'Egypt': 'Египет',
    'Eritrea': 'Эритрея',
    'North Korea': 'Северная Корея',
    'Turkey': 'Турция',
    'Indonesia': 'Индонезия',
    'Sudan': 'Судан',
    'Ethiopia': 'Эфиопия',
    'Kenya': 'Кения'
};

const CITIES_RU = {
    'Абуja': 'Абуджа', 'Лагос': 'Лагос', 'Кадуна': 'Кадуна',
    'Дели': 'Дели', 'Мумбаи': 'Мумбаи', 'Одиша': 'Одиша',
    'Пекин': 'Пекин', 'Шанхай': 'Шанхай',
    'Лахор': 'Лахор', 'Исламабад': 'Исламабад',
    'Тегеран': 'Тегеран', 'Исфахан': 'Исфахан',
    'Багдад': 'Багдад', 'Мосул': 'Мосул',
    'Дамаск': 'Дамаск', 'Алеппо': 'Алеппо',
    'Каир': 'Каир', 'Александрия': 'Александрия',
    'Асмэра': 'Асмэра',
    'Пхеньян': 'Пхеньян',
    'Стамбул': 'Стамбул', 'Анкара': 'Анкара',
    'Джакарта': 'Джакарта',
    'Хартум': 'Хартум',
    'Аддис-Абеба': 'Аддис-Абеба',
    'Найроби': 'Найроби'
};

// ============ КООРДИНАТЫ СТРАН ============
const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Абуja': [9.0810, 7.4895], 'Лагос': [6.5244, 3.3792], 'Кадуна': [10.5105, 7.4165] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Дели': [28.7041, 77.1025], 'Мумбаи': [19.0760, 72.8777], 'Одиша': [20.9517, 85.0985] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Пекин': [39.9042, 116.4074], 'Шанхай': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Лахор': [31.5204, 74.3587], 'Исламабад': [33.6844, 73.0479] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Тегеран': [35.6892, 51.3890], 'Исфахан': [32.6539, 51.6660] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Багдад': [33.3152, 44.3661], 'Мосул': [36.3566, 43.1640] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Дамаск': [33.5138, 36.2765], 'Алеппо': [36.2021, 37.1343] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Каир': [30.0444, 31.2357], 'Александрия': [31.2001, 29.9187] }},
    'Eritrea': { lat: 15.1794, lng: 39.7823, cities: { 'Асмэра': [15.3229, 38.9251] }},
    'North Korea': { lat: 40.3399, lng: 127.5101, cities: { 'Пхеньян': [39.0392, 125.7625] }},
    'Turkey': { lat: 38.9637, lng: 35.2433, cities: { 'Стамбул': [41.0082, 28.9784], 'Анкара': [39.9334, 32.8597] }},
    'Indonesia': { lat: -0.7893, lng: 113.9213, cities: { 'Джакарта': [-6.2088, 106.8456] }},
    'Sudan': { lat: 12.8628, lng: 30.2176, cities: { 'Хартум': [15.5007, 32.5599] }},
    'Ethiopia': { lat: 9.1450, lng: 40.4897, cities: { 'Аддис-Абеба': [9.0320, 38.7469] }},
    'Kenya': { lat: -0.0236, lng: 37.9062, cities: { 'Найроби': [-1.2921, 36.8219] }}
};

// ============ ФУНКЦИИ ============

function fetchNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;
        
        const options = {
            headers: {
                'User-Agent': 'PersecutionMap/1.0'
            }
        };
        
        https.get(url, options, (res) => {
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
        }).on('error', reject);
    });
}

// Перевод через LibreTranslate (бесплатный API)
function translateWithLibre(text, source = 'en', target = 'ru') {
    return new Promise((resolve, reject) => {
        if (!text || text.trim().length === 0) {
            resolve('');
            return;
        }
        
        const postData = JSON.stringify({
            q: text.substring(0, 3000), // Лимит
            source: source,
            target: target,
            format: 'text'
        });
        
        const options = {
            hostname: 'libretranslate.de', // Бесплатный публичный сервер
            path: '/translate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.translatedText) {
                        resolve(json.translatedText);
                    } else {
                        console.log(`   ⚠️ LibreTranslate не перевёл, используем оригинал`);
                        resolve(text);
                    }
                } catch (e) {
                    resolve(text);
                }
            });
        });
        
        req.on('error', () => resolve(text));
        req.write(postData);
        req.end();
    });
}

// Резервный перевод через другие сервисы (по очереди)
async function translateText(text) {
    if (!text || text.trim().length === 0) return '';
    
    // Пробуем LibreTranslate
    try {
        const result = await translateWithLibre(text);
        if (result !== text) return result;
    } catch (e) {}
    
    // Если не сработало — возвращаем оригинал с пометкой
    return text;
}

// Простой словарь для базового перевода ключевых слов
function simpleTranslate(text) {
    const dictionary = {
        'killed': 'убит',
        'murdered': 'убит',
        'attacked': 'атакован',
        'attack': 'нападение',
        'church': 'церковь',
        'christian': 'христианин',
        'christians': 'христиане',
        'arrested': 'арестован',
        'arrest': 'арест',
        'prison': 'тюрьма',
        'jailed': 'заключён',
        'persecution': 'гонение',
        'killed': 'убито',
        'dead': 'погибло',
        'victims': 'жертвы',
        'wounded': 'ранено',
        'injured': 'пострадало',
        'bomb': 'бомба',
        'explosion': 'взрыв',
        'kidnapped': 'похищен',
        'abducted': 'похищен',
        'burned': 'сожжён',
        'destroyed': 'разрушен',
        'closed': 'закрыт',
        'ban': 'запрет',
        'illegal': 'незаконный',
        'police': 'полиция',
        'militants': 'боевики',
        'gunmen': 'вооружённые люди',
        'terrorists': 'террористы',
        'extremists': 'экстремисты'
    };
    
    let translated = text;
    for (const [en, ru] of Object.entries(dictionary)) {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        translated = translated.replace(regex, ru);
    }
    
    return translated;
}

function detectType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    if (text.match(/killed|murdered|death|dead|slain|execution/)) return 'убийство';
    if (text.match(/attack|bomb|explosion|shooting|raid|burned/)) return 'нападение';
    if (text.match(/kidnap|abduct|hostage/)) return 'похищение';
    if (text.match(/arrest|detain|prison|jail|imprisoned/)) return 'арест';
    if (text.match(/close|ban|shut|discriminat|fine|restrict/)) return 'дискриминация';
    return 'другое';
}

function extractVictims(text) {
    const patterns = [
        /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed)/i,
        /killed\s*(\d+)/i,
        /(\d+)\s*killed/i,
        /at\s*least\s*(\d+)/i
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

// ============ ОСНОВНАЯ ФУНКЦИЯ ============

async function updateViaNewsAPI() {
    console.log('🚀 Загрузка и перевод новостей...');
    console.log(`⏰ ${new Date().toLocaleString('ru-RU')}\n`);
    
    const allEvents = [];
    const errors = [];
    
    for (const countryData of COUNTRY_QUERIES) {
        try {
            console.log(`📍 ${countryData.name}:`);
            
            const articles = await fetchNews(countryData.query);
            console.log(`   ✅ Найдено статей: ${articles.length}`);
            
            const countryInfo = COUNTRY_DATA[countryData.name];
            const cityName = Object.keys(countryInfo.cities)[0];
            const cityCoords = countryInfo.cities[cityName];
            
            // Обрабатываем статьи
            for (const article of articles) {
                try {
                    console.log(`   🔄 Обработка: ${article.title.substring(0, 40)}...`);
                    
                    // Пробуем перевести, если не получится — используем простой перевод
                    let translatedTitle = await translateText(article.title);
                    let translatedDesc = await translateText(article.description || '');
                    
                    // Если перевод не сработал (тот же текст), применяем простой словарь
                    if (translatedTitle === article.title) {
                        translatedTitle = simpleTranslate(article.title);
                    }
                    if (translatedDesc === article.description) {
                        translatedDesc = simpleTranslate(article.description || '');
                    }
                    
                    const lat = cityCoords[0] + (Math.random() - 0.5) * 2;
                    const lng = cityCoords[1] + (Math.random() - 0.5) * 2;
                    
                    allEvents.push({
                        date: article.publishedAt.split('T')[0],
                        lat: parseFloat(lat.toFixed(4)),
                        lng: parseFloat(lng.toFixed(4)),
                        country: COUNTRY_NAMES_RU[countryData.name] || countryData.name,
                        city: CITIES_RU[cityName] || cityName,
                        type: detectType(article.title, article.description),
                        title: translatedTitle.substring(0, 120),
                        description: translatedDesc.substring(0, 250),
                        source: article.source?.name || 'News API',
                        url: article.url,
                        victims: extractVictims(article.title + ' ' + article.description),
                        originalTitle: article.title
                    });
                    
                    // Пауза чтобы не перегружать API
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (err) {
                    console.log(`   ⚠️ Ошибка обработки: ${err.message}`);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (err) {
            console.log(`   ❌ Ошибка: ${err.message}`);
            errors.push({ country: countryData.name, error: err.message });
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 ИТОГИ:');
    console.log(`${'='.repeat(60)}`);
    console.log(`📰 Всего событий: ${allEvents.length}`);
    console.log(`❌ Ошибок: ${errors.length}`);
    
    // Дедупликация
    const seen = new Set();
    const uniqueEvents = [];
    
    for (const event of allEvents) {
        if (!seen.has(event.url)) {
            seen.add(event.url);
            uniqueEvents.push(event);
        }
    }
    
    uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    const finalEvents = uniqueEvents.slice(0, 50);
    
    console.log(`🎯 Уникальных событий: ${finalEvents.length}`);
    
    // Статистика
    const typeStats = {};
    finalEvents.forEach(e => {
        typeStats[e.type] = (typeStats[e.type] || 0) + 1;
    });
    console.log(`📈 По типам:`, typeStats);
    
    const countryStats = {};
    finalEvents.forEach(e => {
        countryStats[e.country] = (countryStats[e.country] || 0) + 1;
    });
    console.log(`🌍 По странам:`, Object.entries(countryStats).slice(0, 5));
    
    // Сохраняем
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '2.0',
            totalEvents: finalEvents.length,
            sourcesChecked: COUNTRY_QUERIES.length,
            sourcesWorking: COUNTRY_QUERIES.length - errors.length,
            errors: errors,
            updateMethod: 'NEWS_API_RU',
            rssSuccess: true,
            language: 'ru'
        },
        events: finalEvents
    };
    
    const outputPath = path.join(__dirname, 'data', 'events.json');
    
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('💾 РЕЗУЛЬТАТ СОХРАНЕН:');
    console.log(`${'='.repeat(60)}`);
    console.log(`📁 Файл: ${outputPath}`);
    console.log(`✅ Готово!`);
    
    return output;
}

// Запуск
updateViaNewsAPI().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
