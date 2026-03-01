// news-api.js — Исправленная версия с диагностикой
const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Проверяем наличие ключа
if (!NEWS_API_KEY) {
    console.error('❌ NEWS_API_KEY не найден в переменных окружения');
    process.exit(1);
}

console.log('🔑 API Key найден:', NEWS_API_KEY.substring(0, 8) + '...');

const COUNTRY_QUERIES = [
    { name: 'Nigeria', query: 'christian killed OR attacked OR church Nigeria' },
    { name: 'India', query: 'christian persecution OR church attack India' },
    { name: 'China', query: 'christian arrested OR church closed China' },
    { name: 'Pakistan', query: 'christian killed OR blasphemy Pakistan' }
];

const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Абуджа': [9.0810, 7.4895], 'Лагос': [6.5244, 3.3792] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Дели': [28.7041, 77.1025], 'Мумбаи': [19.0760, 72.8777] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Пекин': [39.9042, 116.4074], 'Шанхай': [31.2304, 121.4737] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Лахор': [31.5204, 74.3587], 'Исламабад': [33.6844, 73.0479] }}
};

const KEYWORDS_RU = {
    'christian': 'христианин', 'christians': 'христиане', 'killed': 'убито', 'murdered': 'убито',
    'attacked': 'атаковано', 'attack': 'нападение', 'church': 'церковь', 'arrested': 'арестовано',
    'arrest': 'арест', 'persecution': 'гонение', 'kidnapped': 'похищено', 'abducted': 'похищено',
    'bomb': 'взрыв', 'explosion': 'взрыв', 'burned': 'сожжено', 'closed': 'закрыто'
};

function simpleTranslate(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    for (const [en, ru] of Object.entries(KEYWORDS_RU)) {
        result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ru);
    }
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function fetchNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=3&apiKey=${NEWS_API_KEY}`;
        
        https.get(url, { headers: { 'User-Agent': 'PersecutionMap/1.0' }, timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`   📡 API ответ для "${query.substring(0, 30)}...":`, json.status, '- найдено:', json.totalResults || 0);
                    if (json.status === 'error') reject(new Error(json.message));
                    else resolve(json.articles || []);
                } catch (e) { reject(e); }
            });
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

function detectType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    if (text.match(/killed|murdered|death|dead/)) return 'murder';
    if (text.match(/kidnap|abduct/)) return 'kidnapping';
    if (text.match(/arrest|detain|prison|jail/)) return 'arrest';
    if (text.match(/close|ban|shut|discriminat/)) return 'discrimination';
    if (text.match(/attack|bomb|explosion|shooting|raid|burned/)) return 'attack';
    return 'other';
}

function extractVictims(text) {
    const patterns = [/(\d+)\s*(?:people|christians|killed|dead)/i, /killed\s*(\d+)/i, /(\d+)\s*killed/i];
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
    console.log('🚀 Начало обновления через News API...');
    console.log(`⏰ ${new Date().toISOString()}`);
    
    const allEvents = [];
    const errors = [];
    
    for (const countryData of COUNTRY_QUERIES) {
        try {
            console.log(`\n📍 Обработка: ${countryData.name}`);
            const articles = await fetchNews(countryData.query);
            
            if (!articles || articles.length === 0) {
                console.log(`   ⚠️ Нет статей для ${countryData.name}`);
                continue;
            }
            
            const countryInfo = COUNTRY_DATA[countryData.name];
            const cities = Object.keys(countryInfo.cities);
            
            articles.slice(0, 2).forEach((article, idx) => {
                const cityName = cities[idx % cities.length];
                const cityCoords = countryInfo.cities[cityName];
                const lat = cityCoords[0] + (Math.random() - 0.5);
                const lng = cityCoords[1] + (Math.random() - 0.5);
                
                const event = {
                    date: article.publishedAt ? article.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    lat: parseFloat(lat.toFixed(4)),
                    lng: parseFloat(lng.toFixed(4)),
                    country: countryData.name,
                    city: cityName,
                    type: detectType(article.title || '', article.description || ''),
                    title: simpleTranslate(article.title || 'Без заголовка').substring(0, 120),
                    description: simpleTranslate(article.description || '').substring(0, 250),
                    source: article.source?.name || 'News API',
                    url: article.url || '#',
                    victims: extractVictims((article.title || '') + ' ' + (article.description || ''))
                };
                
                allEvents.push(event);
                console.log(`   ✓ Добавлено: ${event.title.substring(0, 50)}... [${event.type}]`);
            });
            
            await new Promise(r => setTimeout(r, 1000)); // Задержка между странами
            
        } catch (err) {
            console.error(`   ❌ Ошибка ${countryData.name}:`, err.message);
            errors.push({ country: countryData.name, error: err.message });
        }
    }
    
    console.log(`\n📊 ИТОГО: ${allEvents.length} событий найдено`);
    
    // Если ничего не найдено, используем fallback с новыми датами
    if (allEvents.length === 0) {
        console.log('⚠️ Нет данных от API, используем fallback с актуальной датой');
        return generateFallback();
    }
    
    // Дедупликация и сортировка
    const seen = new Set();
    const unique = allEvents.filter(e => {
        const key = e.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
    
    return saveData(unique, errors, 'NEWS_API');
}

function generateFallback() {
    const today = new Date();
    const fallbackEvents = [];
    const types = ['murder', 'attack', 'arrest', 'kidnapping', 'discrimination'];
    const countries = [
        { name: 'Нигерия', city: 'Абуджа', lat: 9.0810, lng: 7.4895 },
        { name: 'Индия', city: 'Дели', lat: 28.7041, lng: 77.1025 },
        { name: 'Иран', city: 'Тегеран', lat: 35.6892, lng: 51.3890 },
        { name: 'Ирак', city: 'Багдад', lat: 33.3152, lng: 44.3661 },
        { name: 'Египет', city: 'Каир', lat: 30.0444, lng: 31.2357 }
    ];
    
    for (let i = 0; i < 8; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const country = countries[i % countries.length];
        
        fallbackEvents.push({
            date: date.toISOString().split('T')[0],
            lat: country.lat + (Math.random() - 0.5) * 0.5,
            lng: country.lng + (Math.random() - 0.5) * 0.5,
            country: country.name,
            city: country.city,
            type: types[i % types.length],
            title: `Тестовое событие ${i + 1} в ${country.city}`,
            description: `Автоматически сгенерированное событие для тестирования. Дата: ${date.toLocaleDateString('ru-RU')}`,
            source: 'Fallback Generator',
            url: '#',
            victims: Math.floor(Math.random() * 10)
        });
    }
    
    return saveData(fallbackEvents, [{ source: 'api', error: 'No data from NewsAPI, generated fallback' }], 'FALLBACK_GENERATED');
}

function saveData(events, errors, method) {
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '2.2',
            totalEvents: events.length,
            sourcesChecked: COUNTRY_QUERIES.length,
            sourcesWorking: COUNTRY_QUERIES.length - errors.length,
            errors: errors,
            updateMethod: method,
            rssSuccess: events.length > 0,
            language: 'ru',
            generatedAt: new Date().toLocaleString('ru-RU')
        },
        events: events
    };
    
    // Определяем путь (важно для GitHub Actions)
    const dataDir = path.join(__dirname, 'data');
    const outputPath = path.join(dataDir, 'events.json');
    
    console.log('\n💾 Сохранение данных:');
    console.log('   Директория:', dataDir);
    console.log('   Файл:', outputPath);
    
    // Создаём директорию если нужно
    if (!fs.existsSync(dataDir)) {
        console.log('   📁 Создаём директорию data...');
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Проверяем права на запись
    try {
        fs.accessSync(dataDir, fs.constants.W_OK);
        console.log('   ✅ Права на запись есть');
    } catch (e) {
        console.error('   ❌ Нет прав на запись в', dataDir);
    }
    
    // Записываем файл
    try {
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        console.log('   ✅ Файл записан успешно');
        
        // Проверяем, что файл действительно записан
        const stats = fs.statSync(outputPath);
        console.log(`   📊 Размер файла: ${stats.size} байт`);
        console.log(`   🕐 Изменён: ${stats.mtime.toISOString()}`);
        
        // Проверяем содержимое
        const check = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        console.log(`   📋 Событий в файле: ${check.events.length}`);
        console.log(`   📅 Последнее обновление: ${check.metadata.lastUpdated}`);
        
    } catch (err) {
        console.error('   ❌ Ошибка записи:', err);
        throw err;
    }
    
    return output;
}

// Запуск
updateViaNewsAPI().then(result => {
    console.log('\n✅ Обновление завершено успешно');
    console.log(`📊 Метод: ${result.metadata.updateMethod}`);
    console.log(`📈 Событий: ${result.events.length}`);
    process.exit(0);
}).catch(err => {
    console.error('\n💥 Критическая ошибка:', err);
    // Пробуем fallback даже при критической ошибке
    try {
        generateFallback();
        console.log('🔄 Fallback создан после ошибки');
        process.exit(0);
    } catch (e) {
        console.error('💥 Fallback тоже не сработал:', e);
        process.exit(1);
    }
});
