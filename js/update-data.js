const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseString } = require('xml2js');

// Конфигурация источников
const SOURCES = {
    vaticanNews: 'https://www.vaticannews.va/en/church/rss.xml',
    persecutionOrg: 'https://persecution.org/feed/',
    christianPost: 'https://www.christianpost.com/news/world/rss/',
    releaseInternational: 'https://www.releaseinternational.org/feed/',
    missionNetworkNews: 'https://mnnonline.org/feed'
};

// Геокодирование городов (простая база)
const GEOCACHE = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: {
        'Abuja': [9.0810, 7.4895],
        'Kaduna': [10.5105, 7.4165],
        'Borno': [11.8333, 13.1500],
        'Jos': [9.8965, 8.8583]
    }},
    'India': { lat: 20.5937, lng: 78.9629, cities: {
        'Odisha': [20.9517, 85.0985],
        'Uttar Pradesh': [26.8467, 80.9462],
        'Chhattisgarh': [21.2514, 81.6296],
        'Rajasthan': [26.9124, 75.7873]
    }},
    'North Korea': { lat: 40.3399, lng: 127.5101, cities: {
        'Pyongyang': [39.0392, 125.7625]
    }},
    'Somalia': { lat: 5.1521, lng: 46.1996, cities: {
        'Mogadishu': [2.0469, 45.3182]
    }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: {
        'Tehran': [35.6892, 51.3890]
    }},
    'Eritrea': { lat: 15.1794, lng: 39.7823, cities: {
        'Asmara': [15.3229, 38.9251]
    }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: {
        'Aleppo': [36.2021, 37.1343],
        'Damascus': [33.5138, 36.2765]
    }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: {
        'Lahore': [31.5204, 74.3587],
        'Islamabad': [33.6844, 73.0479]
    }},
    'China': { lat: 35.8617, lng: 104.1954, cities: {
        'Beijing': [39.9042, 116.4074]
    }},
    'Myanmar': { lat: 21.9162, lng: 95.9560, cities: {
        'Mandalay': [21.9162, 95.9560],
        'Yangon': [16.8661, 96.1951]
    }},
    'Sudan': { lat: 12.8628, lng: 30.2176, cities: {
        'Khartoum': [15.5007, 32.5599]
    }},
    'Libya': { lat: 26.3351, lng: 17.2283, cities: {
        'Tripoli': [32.8872, 13.1913]
    }},
    'Yemen': { lat: 15.5527, lng: 48.5164, cities: {
        'Sanaa': [15.3694, 44.1910]
    }},
    'Afghanistan': { lat: 33.9391, lng: 67.7100, cities: {
        'Kabul': [34.5553, 69.2075]
    }},
    'Saudi Arabia': { lat: 23.8859, lng: 45.0792, cities: {
        'Riyadh': [24.7136, 46.6753]
    }},
    'DRC': { lat: -4.0383, lng: 21.7587, cities: {
        'Kivu': [-1.6585, 29.2203]
    }},
    'Mali': { lat: 17.5707, lng: -3.9962, cities: {
        'Bamako': [12.6392, -8.0029]
    }},
    'Burkina Faso': { lat: 12.2383, lng: -1.5616, cities: {
        'Ouagadougou': [12.3714, -1.5197]
    }},
    'Mozambique': { lat: -18.6657, lng: 35.5296, cities: {
        'Pemba': [-12.9732, 40.5178]
    }},
    'Niger': { lat: 17.6078, lng: 8.0817, cities: {
        'Niamey': [13.5116, 2.1254]
    }},
    'Algeria': { lat: 28.0339, lng: 1.6596, cities: {
        'Algiers': [36.7538, 3.0588],
        'Bejaia': [36.7559, 5.0843]
    }}
};

// Ключевые слова для определения типа инцидента
const TYPE_PATTERNS = {
    murder: /(killed|murdered|executed|slain|death|died|massacre|убий|казн|смерть)/i,
    attack: /(attack|attacked|bombed|raid|stormed|burned|destroyed|shooting|взрыв|атак|напад)/i,
    kidnapping: /(kidnapped|abducted|hostage|captive|missing|похищ|захват|плен)/i,
    arrest: /(arrested|detained|imprisoned|jailed|sentenced|арест|тюрьм|задерж)/i,
    discrimination: /(closed|banned|fined|restricted|denied|registered|закрыт|запрет|штраф)/i
};

// Ключевые слова для определения страны
const COUNTRY_PATTERNS = {
    'Nigeria': /nigeria|нигерия|nigerian/i,
    'India': /india|индия|indian/i,
    'North Korea': /north korea|северная корея|dprk/i,
    'Somalia': /somalia|сомали/i,
    'Iran': /iran|иран/i,
    'Eritrea': /eritrea|эритрея/i,
    'Syria': /syria|сирия/i,
    'Pakistan': /pakistan|пакистан/i,
    'China': /china|китай/i,
    'Myanmar': /myanmar|burma|мьянма|бирма/i,
    'Sudan': /sudan|судан/i,
    'Libya': /libya|ливия/i,
    'Yemen': /yemen|йемен/i,
    'Afghanistan': /afghanistan|афганистан/i,
    'Saudi Arabia': /saudi|саудов/i,
    'DRC': /congo|конго|drc/i,
    'Mali': /mali|мали/i,
    'Burkina Faso': /burkina|буркина/i,
    'Mozambique': /mozambique|мозамбик/i,
    'Niger': /\bniger\b|нигер\b/i,
    'Algeria': /algeria|алжир/i
};

/**
 * Загрузка RSS-ленты
 */
function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Парсинг RSS в JSON
 */
function parseRSS(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
            if (err) reject(err);
            else resolve(result?.rss?.channel?.[0]?.item || []);
        });
    });
}

/**
 * Определение типа инцидента
 */
function detectType(text) {
    for (const [type, pattern] of Object.entries(TYPE_PATTERNS)) {
        if (pattern.test(text)) return type;
    }
    return 'other';
}

/**
 * Определение страны
 */
function detectCountry(text) {
    for (const [country, pattern] of Object.entries(COUNTRY_PATTERNS)) {
        if (pattern.test(text)) return country;
    }
    return null;
}

/**
 * Извлечение числа жертв
 */
function extractVictims(text) {
    const patterns = [
        /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed|died)/i,
        /killed\s*(\d+)/i,
        /(\d+)\s*(?:убит|погиб|арестован|задержан)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return parseInt(match[1]);
    }
    return 0;
}

/**
 * Получение координат
 */
function getCoordinates(country, city = null) {
    const countryData = GEOCACHE[country];
    if (!countryData) return { lat: 0, lng: 0 };
    
    if (city && countryData.cities[city]) {
        return { lat: countryData.cities[city][0], lng: countryData.cities[city][1] };
    }
    
    return { lat: countryData.lat, lng: countryData.lng };
}

/**
 * Обработка новости
 */
function processNewsItem(item) {
    const title = item.title?.[0] || '';
    const description = item.description?.[0] || '';
    const link = item.link?.[0] || '';
    const pubDate = item.pubDate?.[0] || new Date().toISOString();
    
    const fullText = title + ' ' + description;
    
    // Проверяем, относится ли к христианским преследованиям
    const christianKeywords = /(christian|church|pastor|believer|persecution|гонения|христиан|церк|пастор)/i;
    if (!christianKeywords.test(fullText)) return null;
    
    const country = detectCountry(fullText);
    if (!country) return null;
    
    const type = detectType(fullText);
    const victims = extractVictims(fullText);
    const coords = getCoordinates(country);
    
    return {
        date: new Date(pubDate).toISOString().split('T')[0],
        lat: coords.lat,
        lng: coords.lng,
        country: country,
        city: Object.keys(GEOCACHE[country]?.cities || {})[0] || 'Unknown',
        type: type,
        title: title.substring(0, 100),
        description: description.replace(/<[^>]*>/g, '').substring(0, 200),
        source: new URL(link).hostname.replace('www.', ''),
        url: link,
        victims: victims
    };
}

/**
 * Основная функция обновления
 */
async function updateData() {
    console.log('🚀 Начало обновления данных...');
    console.log(`📅 ${new Date().toLocaleString()}`);
    
    const allEvents = [];
    const errors = [];
    
    for (const [sourceName, url] of Object.entries(SOURCES)) {
        try {
            console.log(`\n📡 Загрузка: ${sourceName}`);
            const xml = await fetchRSS(url);
            const items = await parseRSS(xml);
            
            console.log(`   Найдено записей: ${items.length}`);
            
            let processed = 0;
            for (const item of items.slice(0, 20)) { // Берём последние 20
                const event = processNewsItem(item);
                if (event) {
                    allEvents.push(event);
                    processed++;
                }
            }
            
            console.log(`   Обработано событий: ${processed}`);
            
        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            errors.push({ source: sourceName, error: error.message });
        }
    }
    
    // Удаление дубликатов по URL
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.url, e])).values());
    
    // Сортировка по дате (новые сверху)
    uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Ограничение количества (чтобы файл не был слишком большим)
    const finalEvents = uniqueEvents.slice(0, 100);
    
    // Формирование итогового JSON
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.0',
            totalEvents: finalEvents.length,
            sourcesChecked: Object.keys(SOURCES),
            errors: errors,
            updateStatus: errors.length === 0 ? 'success' : 'partial'
        },
        events: finalEvents
    };
    
    // Сохранение
    const outputPath = path.join(__dirname, '..', 'data', 'events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`\n✅ Готово!`);
    console.log(`📊 Всего событий: ${finalEvents.length}`);
    console.log(`📁 Сохранено в: ${outputPath}`);
    console.log(`⚠️ Ошибок: ${errors.length}`);
    
    // Статистика по типам
    const typeStats = {};
    finalEvents.forEach(e => {
        typeStats[e.type] = (typeStats[e.type] || 0) + 1;
    });
    console.log(`📈 Статистика по типам:`, typeStats);
    
    return output;
}

// Запуск
if (require.main === module) {
    updateData().catch(err => {
        console.error('💥 Критическая ошибка:', err);
        process.exit(1);
    });
}

module.exports = { updateData };
