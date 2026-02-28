// news-api.js - News API с улучшенным переводом
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
    { name: 'Egypt', query: 'christian attacked OR church Egypt' },
    { name: 'Eritrea', query: 'christian arrested Eritrea' },
    { name: 'North Korea', query: 'christian persecution North Korea' },
    { name: 'Turkey', query: 'christian persecution Turkey' },
    { name: 'Indonesia', query: 'christian church attacked Indonesia' },
    { name: 'Sudan', query: 'christian persecution Sudan' },
    { name: 'Ethiopia', query: 'christian killed Ethiopia' },
    { name: 'Kenya', query: 'christian attacked Kenya' },
    { name: 'South Sudan', query: 'christian killed OR attacked South Sudan' }
];

// ============ ПЕРЕВОДЫ ============
const COUNTRY_NAMES_RU = {
    'Nigeria': 'Нигерия', 'India': 'Индия', 'China': 'Китай',
    'Pakistan': 'Пакистан', 'Iran': 'Иран', 'Iraq': 'Ирак',
    'Syria': 'Сирия', 'Egypt': 'Египет', 'Eritrea': 'Эритрея',
    'North Korea': 'Северная Корея', 'Turkey': 'Турция',
    'Indonesia': 'Индонезия', 'Sudan': 'Судан', 'Ethiopia': 'Эфиопия',
    'Kenya': 'Кения', 'South Sudan': 'Южный Судан'
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
    'Асмэра': 'Асмэра', 'Пхеньян': 'Пхеньян',
    'Стамбул': 'Стамбул', 'Анкара': 'Анкара',
    'Джакарта': 'Джакарта', 'Хартум': 'Хартум',
    'Аддис-Абеба': 'Аддис-Абеба', 'Найроби': 'Найроби',
    'Джуба': 'Джуба'
};

const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Абуja': [9.0810, 7.4895], 'Лагос': [6.5244, 3.3792] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Дели': [28.7041, 77.1025], 'Мумбаи': [19.0760, 72.8777] }},
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
    'Kenya': { lat: -0.0236, lng: 37.9062, cities: { 'Найроби': [-1.2921, 36.8219] }},
    'South Sudan': { lat: 6.8770, lng: 31.3070, cities: { 'Джуба': [4.8594, 31.5713] }}
};

// ============ УЛУЧШЕННЫЙ ПЕРЕВОД ============

// Расширенный словарь с фразами
const TRANSLATION_DICT = {
    // Глаголы и действия
    'killed': 'убито',
    'murdered': 'убито',
    'shot dead': 'застрелено',
    'beheaded': 'обезглавлено',
    'stabbed': 'зарезано',
    'attacked': 'нападение совершено на',
    'attack': 'нападение',
    'ambushed': 'устроена засада на',
    'bombed': 'взорвано',
    'burned': 'сожжено',
    'destroyed': 'разрушено',
    'vandalized': 'подвергнуто вандализму',
    'looted': 'разграблено',
    'raided': 'рейд проведён на',
    'stormed': 'штурмовано',
    'seized': 'захвачено',
    'occupied': 'оккупировано',
    'taken over': 'захвачено',
    
    // Аресты и тюрьма
    'arrested': 'арестовано',
    'detained': 'задержано',
    'imprisoned': 'заключено в тюрьму',
    'jailed': 'посажено в тюрьму',
    'sentenced': 'приговорено',
    'convicted': 'осуждено',
    'charged with': 'обвинено в',
    'faces charges': 'сталкивается с обвинениями',
    'faces death threats': 'получает угрозы смерти',
    'faces death penalty': 'сталкивается с смертной казнью',
    'on trial': 'на суде',
    'awaiting trial': 'ожидает суда',
    
    // Похищения
    'kidnapped': 'похищено',
    'abducted': 'похищено',
    'taken hostage': 'взято в заложники',
    'held captive': 'удерживается в плену',
    'missing': 'пропало без вести',
    'ransom': 'выкуп',
    
    // Дискриминация
    'forced to close': 'вынуждено закрыться',
    'shut down': 'закрыто',
    'banned': 'запрещено',
    'outlawed': 'запрещено законом',
    'denied registration': 'отказано в регистрации',
    'denied permit': 'отказано в разрешении',
    'fined': 'оштрафовано',
    'expelled': 'выслано',
    'deported': 'депортировано',
    
    // Люди
    'christian': 'христианин',
    'christians': 'христиане',
    'believer': 'верующий',
    'believers': 'верующие',
    'pastor': 'пастор',
    'pastors': 'пасторы',
    'priest': 'священник',
    'priests': 'священники',
    'bishop': 'епископ',
    'bishops': 'епископы',
    'missionary': 'миссионер',
    'missionaries': 'миссионеры',
    'convert': 'обращённый',
    'converts': 'обращённые',
    'worshipper': 'прихожанин',
    'worshippers': 'прихожане',
    'refugee': 'беженец',
    'refugees': 'беженцы',
    'villager': 'житель деревни',
    'villagers': 'жители деревни',
    
    // Места
    'church': 'церковь',
    'churches': 'церкви',
    'mosque': 'мечеть',
    'temple': 'храм',
    'prayer hall': 'молитвенный дом',
    'worship place': 'место поклонения',
    'bible school': 'библейская школа',
    'seminary': 'семинария',
    'refugee camp': 'лагерь беженцев',
    'camp': 'лагерь',
    'village': 'деревня',
    'compound': 'комплекс',
    
    // Прилагательные
    'armed': 'вооружённые',
    'masked': 'в масках',
    'unidentified': 'неопознанные',
    'suspected': 'подозреваемые',
    'radical': 'радикальные',
    'islamist': 'исламистские',
    'extremist': 'экстремистские',
    'militant': 'боевики',
    'militants': 'боевики',
    'gunmen': 'вооружённые люди',
    'terrorists': 'террористы',
    'insurgents': 'повстанцы',
    'rebels': 'повстанцы',
    
    // Количества
    'at least': 'по меньшей мере',
    'up to': 'до',
    'more than': 'более',
    'over': 'более',
    'dozens': 'десятки',
    'scores': 'множество',
    'hundreds': 'сотни',
    'thousands': 'тысячи',
    
    // Прочее
    'following': 'после',
    'after': 'после',
    'during': 'во время',
    'amid': 'на фоне',
    'amidst': 'среди',
    'in response to': 'в ответ на',
    'according to': 'по данным',
    'sources say': 'источники сообщают',
    'reports indicate': 'сообщения указывают',
    'it is reported': 'сообщается'
};

// Шаблоны для типичных конструкций
const TEMPLATES = [
    { pattern: /(\d+)\s+christians?\s+killed\s+in\s+(.+)/i, 
      replace: 'Убито $1 христиан в $2' },
    { pattern: /christians?\s+faces?\s+death\s+threats?\s+in\s+(.+)/i, 
      replace: 'Христиане получают угрозы смерти в $1' },
    { pattern: /(\d+)\s+killed\s+in\s+attack\s+on\s+(.+)/i, 
      replace: '$1 убито в нападении на $2' },
    { pattern: /church\s+attacked\s+in\s+(.+)/i, 
      replace: 'Церковь атакована в $1' },
    { pattern: /pastor\s+arrested\s+in\s+(.+)/i, 
      replace: 'Пастор арестован в $1' },
    { pattern: /christians?\s+arrested?\s+in\s+(.+)/i, 
      replace: 'Христиане арестованы в $1' },
    { pattern: /(\d+)\s+christians?\s+arrested/i, 
      replace: 'Арестовано $1 христиан' }
];

function smartTranslate(text) {
    if (!text) return '';
    
    let translated = text;
    
    // Сначала применяем шаблоны
    for (const template of TEMPLATES) {
        if (template.pattern.test(translated)) {
            translated = translated.replace(template.pattern, template.replace);
            return translated; // Шаблон сработал — возвращаем
        }
    }
    
    // Затем словарь (сначала длинные фразы, потом короткие)
    const sortedKeys = Object.keys(TRANSLATION_DICT).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        translated = translated.replace(regex, TRANSLATION_DICT[key]);
    }
    
    // Дополнительные правила
    translated = translated
        .replace(/\bin\b/gi, 'в')
        .replace(/\bon\b/gi, 'на')
        .replace(/\bof\b/gi, 'из')
        .replace(/\bfor\b/gi, 'за')
        .replace(/\bwith\b/gi, 'с')
        .replace(/\bfrom\b/gi, 'из')
        .replace(/\bto\b/gi, 'к')
        .replace(/\band\b/gi, 'и');
    
    return translated;
}

// ============ ОСТАЛЬНЫЕ ФУНКЦИИ ============

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
            
            for (const article of articles) {
                try {
                    console.log(`   🔄 Перевод: ${article.title.substring(0, 50)}...`);
                    
                    // Умный перевод
                    const translatedTitle = smartTranslate(article.title);
                    const translatedDesc = smartTranslate(article.description || '');
                    
                    console.log(`      → ${translatedTitle.substring(0, 50)}...`);
                    
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
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (err) {
                    console.log(`   ⚠️ Ошибка: ${err.message}`);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
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
    
    // Примеры переводов
    console.log(`\n📝 Примеры переводов:`);
    finalEvents.slice(0, 3).forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.title}`);
    });
    
    // Сохраняем
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '2.1',
            totalEvents: finalEvents.length,
            sourcesChecked: COUNTRY_QUERIES.length,
            sourcesWorking: COUNTRY_QUERIES.length - errors.length,
            errors: errors,
            updateMethod: 'NEWS_API_RU_SMART',
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
    console.log('💾 СОХРАНЕНО!');
    console.log(`${'='.repeat(60)}`);
    
    return output;
}

// Запуск
updateViaNewsAPI().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
