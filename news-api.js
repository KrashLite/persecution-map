// news-api.js - Альтернатива RSS через NewsAPI
const fs = require('fs');
const path = require('path');
const https = require('https');

// ============ ВАШ API КЛЮЧ ============
const API_KEY = '6392062ebc7b41d4958f992a50bad308';

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
    { name: 'North Korea', query: 'christian persecution North Korea' }
];

// ============ КООРДИНАТЫ СТРАН ============
const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Abuja': [9.0810, 7.4895], 'Lagos': [6.5244, 3.3792], 'Kaduna': [10.5105, 7.4165] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Delhi': [28.7041, 77.1025], 'Mumbai': [19.0760, 72.8777], 'Odisha': [20.9517, 85.0985] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Lahore': [31.5204, 74.3587], 'Islamabad': [33.6844, 73.0479] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Tehran': [35.6892, 51.3890], 'Isfahan': [32.6539, 51.6660] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Baghdad': [33.3152, 44.3661], 'Mosul': [36.3566, 43.1640] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Damascus': [33.5138, 36.2765], 'Aleppo': [36.2021, 37.1343] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Cairo': [30.0444, 31.2357], 'Alexandria': [31.2001, 29.9187] }},
    'Eritrea': { lat: 15.1794, lng: 39.7823, cities: { 'Asmara': [15.3229, 38.9251] }},
    'North Korea': { lat: 40.3399, lng: 127.5101, cities: { 'Pyongyang': [39.0392, 125.7625] }}
};

// ============ ФУНКЦИИ ============

function fetchNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${API_KEY}`;
        
        console.log(`   🔍 Запрос: ${query.substring(0, 50)}...`);
        
        // ВАЖНО: Добавляем User-Agent заголовок
        const options = {
            headers: {
                'User-Agent': 'PersecutionMap/1.0 (github.com/krashlite/persecution-map)'
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
    if (text.match(/killed|murdered|death|dead|slain|execution/)) return 'murder';
    if (text.match(/attack|bomb|explosion|shooting|raid|burned/)) return 'attack';
    if (text.match(/kidnap|abduct|hostage/)) return 'kidnapping';
    if (text.match(/arrest|detain|prison|jail|imprisoned/)) return 'arrest';
    if (text.match(/close|ban|shut|discriminat|fine|restrict/)) return 'discrimination';
    return 'other';
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
    console.log('🚀 Загрузка новостей через News API...');
    console.log(`⏰ ${new Date().toLocaleString()}\n`);
    
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
            
            // Добавляем случайный разброс координат
            const lat = cityCoords[0] + (Math.random() - 0.5) * 2;
            const lng = cityCoords[1] + (Math.random() - 0.5) * 2;
            
            const countryEvents = articles.map(article => ({
                date: article.publishedAt.split('T')[0],
                lat: parseFloat(lat.toFixed(4)),
                lng: parseFloat(lng.toFixed(4)),
                country: countryData.name,
                city: cityName,
                type: detectType(article.title, article.description),
                title: article.title.substring(0, 120),
                description: (article.description || '').substring(0, 250),
                source: article.source?.name || 'News API',
                url: article.url,
                victims: extractVictims(article.title + ' ' + article.description)
            }));
            
            allEvents.push(...countryEvents);
            
            // Пауза чтобы не превысить лимит API
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
    
    // Дедупликация по URL
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
    
    // Статистика по типам
    const typeStats = {};
    finalEvents.forEach(e => {
        typeStats[e.type] = (typeStats[e.type] || 0) + 1;
    });
    console.log(`📈 По типам:`, typeStats);
    
    // Статистика по странам
    const countryStats = {};
    finalEvents.forEach(e => {
        countryStats[e.country] = (countryStats[e.country] || 0) + 1;
    });
    console.log(`🌍 По странам:`, Object.entries(countryStats).slice(0, 5));
    
    // Сохраняем в файл
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.5',
            totalEvents: finalEvents.length,
            sourcesChecked: COUNTRY_QUERIES.length,
            sourcesWorking: COUNTRY_QUERIES.length - errors.length,
            errors: errors,
            updateMethod: 'NEWS_API',
            rssSuccess: true
        },
        events: finalEvents
    };
    
    const outputPath = path.join(__dirname, 'data', 'events.json');
    
    // Создаём папку data если её нет
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