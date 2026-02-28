// news-api.js - Рабочая версия с базовым переводом
const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_API_KEY = process.env.NEWS_API_KEY || '6392062ebc7b41d4958f992a50bad308';

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
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Абуджа': [9.0810, 7.4895], 'Лагос': [6.5244, 3.3792] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Дели': [28.7041, 77.1025], 'Мумбаи': [19.0760, 72.8777] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Пекин': [39.9042, 116.4074], 'Шанхай': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Лахор': [31.5204, 74.3587], 'Исламабад': [33.6844, 73.0479] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Тегеран': [35.6892, 51.3890], 'Исфахан': [32.6539, 51.6660] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Багдад': [33.3152, 44.3661], 'Мосул': [36.3566, 43.1640] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Дамаск': [33.5138, 36.2765], 'Алеппо': [36.2021, 37.1343] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Каир': [30.0444, 31.2357], 'Александрия': [31.2001, 29.9187] }}
};

// Простой словарь для ключевых слов
const KEYWORDS_RU = {
    'christian': 'христианин',
    'christians': 'христиане',
    'killed': 'убито',
    'attacked': 'атаковано',
    'attack': 'нападение',
    'church': 'церковь',
    'churches': 'церкви',
    'arrested': 'арестовано',
    'arrest': 'арест',
    'persecution': 'гонение',
    'pastor': 'пастор',
    'priest': 'священник',
    'believers': 'верующие'
};

function simpleTranslate(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    
    for (const [en, ru] of Object.entries(KEYWORDS_RU)) {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, ru);
    }
    
    return result.charAt(0).toUpperCase() + result.slice(1);
}

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

function detectType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    if (text.match(/killed|murdered|death|dead/)) return 'убийство';
    if (text.match(/attack|bomb|explosion|shooting|raid|burned/)) return 'нападение';
    if (text.match(/kidnap|abduct/)) return 'похищение';
    if (text.match(/arrest|detain|prison|jail/)) return 'арест';
    if (text.match(/close|ban|shut|discriminat|fine/)) return 'дискриминация';
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

async function updateViaNewsAPI() {
    console.log('🚀 Загрузка новостей...');
    console.log(`⏰ ${new Date().toLocaleString('ru-RU')}\n`);
    
    const allEvents = [];
    const errors = [];
    
    for (const countryData of COUNTRY_QUERIES) {
        try {
            console.log(`📍 ${countryData.name}:`);
            
            const articles = await fetchNews(countryData.query);
            console.log(`   ✅ Найдено: ${articles.length}`);
            
            const countryInfo = COUNTRY_DATA[countryData.name];
            const cityName = Object.keys(countryInfo.cities)[0];
            const cityCoords = countryInfo.cities[cityName];
            
            for (const article of articles.slice(0, 5)) {
                try {
                    const originalTitle = article.title || '';
                    const originalDesc = article.description || '';
                    
                    // Базовый перевод
                    const translatedTitle = simpleTranslate(originalTitle);
                    
                    const lat = cityCoords[0] + (Math.random() - 0.5) * 2;
                    const lng = cityCoords[1] + (Math.random() - 0.5) * 2;
                    
                    allEvents.push({
                        date: article.publishedAt ? article.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        lat: parseFloat(lat.toFixed(4)),
                        lng: parseFloat(lng.toFixed(4)),
                        country: countryData.name,
                        city: cityName,
                        type: detectType(originalTitle, originalDesc),
                        title: translatedTitle.substring(0, 120),
                        description: simpleTranslate(originalDesc).substring(0, 250),
                        source: article.source?.name || 'News API',
                        url: article.url || '#',
                        victims: extractVictims(originalTitle + ' ' + originalDesc)
                    });
                    
                } catch (err) {
                    console.log(`   ⚠️ Ошибка обработки: ${err.message}`);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (err) {
            console.log(`   ❌ Ошибка: ${err.message}`);
            errors.push({ country: countryData.name, error: err.message });
        }
    }
    
    console.log(`\n📊 Всего событий: ${allEvents.length}`);
    
    // Дедупликация
    const seen = new Set();
    const uniqueEvents = [];
    
    for (const event of allEvents) {
        const key = event.url + event.title;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueEvents.push(event);
        }
    }
    
    uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    const finalEvents = uniqueEvents.slice(0, 50);
    
    console.log(`🎯 Уникальных: ${finalEvents.length}`);
    
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '2.0',
            totalEvents: finalEvents.length,
            sourcesChecked: COUNTRY_QUERIES.length,
            sourcesWorking: COUNTRY_QUERIES.length - errors.length,
            errors: errors,
            updateMethod: 'NEWS_API',
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
    
    console.log(`\n✅ Сохранено: ${finalEvents.length} событий`);
    return output;
}

updateViaNewsAPI().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
