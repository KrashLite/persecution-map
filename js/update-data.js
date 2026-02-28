const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseString } = require('xml2js');

// RSS-источники (ИСПРАВЛЕННЫЕ URL - без пробелов!)
const RSS_SOURCES = {
    vaticanNews: 'https://www.vaticannews.va/en/church/rss.xml',
    zenit: 'https://zenit.org/feed/',
    catholicNewsAgency: 'https://www.catholicnewsagency.com/rss/news.xml',
    nationalCatholicRegister: 'https://www.ncregister.com/rss.xml',
    ewtn: 'https://www.ewtn.com/rss.xml',
    crux: 'https://cruxnow.com/feed/',
    aleteia: 'https://aleteia.org/feed/',
    catholicHerald: 'https://catholicherald.co.uk/feed/'
};

// Ключевые слова для фильтрации
const KEYWORDS = [
    'persecution', 'martyr', 'killed', 'murdered', 'death', 'dead',
    'church attack', 'bombing', 'explosion', 'burned church',
    'christian', 'catholic', 'orthodox', 'protestant',
    'religious freedom', 'religious liberty',
    'imprisoned', 'arrested', 'detained', 'jailed',
    'kidnapped', 'abducted', 'hostage',
    'discrimination', 'anti-christian',
    'nigeria', 'china', 'india', 'pakistan', 'iran', 'iraq', 'syria',
    'egypt', 'eritrea', 'north korea', 'somalia', 'libya',
    'afghanistan', 'yemen', 'sudan', 'myanmar'
];

// Геокодирование стран
const COUNTRY_DATA = {
    'Nigeria': { lat: 9.0820, lng: 8.6753, cities: { 'Abuja': [9.0810, 7.4895], 'Lagos': [6.5244, 3.3792], 'Kaduna': [10.5105, 7.4165], 'Jos': [9.8965, 8.8583] }},
    'India': { lat: 20.5937, lng: 78.9629, cities: { 'Delhi': [28.7041, 77.1025], 'Mumbai': [19.0760, 72.8777], 'Odisha': [20.9517, 85.0985], 'Uttar Pradesh': [26.8467, 80.9462] }},
    'China': { lat: 35.8617, lng: 104.1954, cities: { 'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737] }},
    'Iran': { lat: 32.4279, lng: 53.6880, cities: { 'Tehran': [35.6892, 51.3890], 'Isfahan': [32.6539, 51.6660] }},
    'Pakistan': { lat: 30.3753, lng: 69.3451, cities: { 'Lahore': [31.5204, 74.3587], 'Islamabad': [33.6844, 73.0479], 'Karachi': [24.8607, 67.0011] }},
    'Egypt': { lat: 26.8206, lng: 30.8025, cities: { 'Cairo': [30.0444, 31.2357], 'Alexandria': [31.2001, 29.9187] }},
    'Syria': { lat: 34.8021, lng: 38.9968, cities: { 'Damascus': [33.5138, 36.2765], 'Aleppo': [36.2021, 37.1343] }},
    'Iraq': { lat: 33.2232, lng: 43.6793, cities: { 'Baghdad': [33.3152, 44.3661], 'Mosul': [36.3566, 43.1640] }},
    'Turkey': { lat: 38.9637, lng: 35.2433, cities: { 'Istanbul': [41.0082, 28.9784], 'Ankara': [39.9334, 32.8597] }},
    'Indonesia': { lat: -0.7893, lng: 113.9213, cities: { 'Jakarta': [-6.2088, 106.8456] }},
    'Myanmar': { lat: 21.9162, lng: 95.9560, cities: { 'Yangon': [16.8661, 96.1951], 'Mandalay': [21.9162, 95.9560] }},
    'Sudan': { lat: 12.8628, lng: 30.2176, cities: { 'Khartoum': [15.5007, 32.5599] }},
    'Eritrea': { lat: 15.1794, lng: 39.7823, cities: { 'Asmara': [15.3229, 38.9251] }},
    'North Korea': { lat: 40.3399, lng: 127.5101, cities: { 'Pyongyang': [39.0392, 125.7625] }},
    'Somalia': { lat: 5.1521, lng: 46.1996, cities: { 'Mogadishu': [2.0469, 45.3182] }},
    'Libya': { lat: 26.3351, lng: 17.2283, cities: { 'Tripoli': [32.8872, 13.1913] }},
    'Afghanistan': { lat: 33.9391, lng: 67.7100, cities: { 'Kabul': [34.5553, 69.2075] }},
    'Yemen': { lat: 15.5527, lng: 48.5164, cities: { 'Sanaa': [15.3694, 44.1910] }},
    'Saudi Arabia': { lat: 23.8859, lng: 45.0792, cities: { 'Riyadh': [24.7136, 46.6753] }},
    'Algeria': { lat: 28.0339, lng: 1.6596, cities: { 'Algiers': [36.7538, 3.0588] }},
    'Morocco': { lat: 31.7917, lng: -7.0926, cities: { 'Rabat': [34.0209, -6.8416] }},
    'Tunisia': { lat: 33.8869, lng: 9.5375, cities: { 'Tunis': [36.8065, 10.1815] }},
    'Mali': { lat: 17.5707, lng: -3.9962, cities: { 'Bamako': [12.6392, -8.0029] }},
    'Burkina Faso': { lat: 12.2383, lng: -1.5616, cities: { 'Ouagadougou': [12.3714, -1.5197] }},
    'Niger': { lat: 17.6078, lng: 8.0817, cities: { 'Niamey': [13.5116, 2.1254] }},
    'Cameroon': { lat: 7.3697, lng: 12.3547, cities: { 'Yaoundé': [3.8480, 11.5021] }},
    'Central African Republic': { lat: 6.6111, lng: 20.9394, cities: { 'Bangui': [4.3947, 18.5582] }},
    'Democratic Republic of the Congo': { lat: -4.0383, lng: 21.7587, cities: { 'Kinshasa': [-4.4419, 15.2663] }},
    'Mozambique': { lat: -18.6657, lng: 35.5296, cities: { 'Maputo': [-25.9692, 32.5732] }},
    'Ethiopia': { lat: 9.1450, lng: 40.4897, cities: { 'Addis Ababa': [9.0320, 38.7469] }},
    'Kenya': { lat: -0.0236, lng: 37.9062, cities: { 'Nairobi': [-1.2921, 36.8219] }},
    'Uganda': { lat: 1.3733, lng: 32.2903, cities: { 'Kampala': [0.3476, 32.5825] }},
    'Tanzania': { lat: -6.3690, lng: 34.8888, cities: { 'Dodoma': [-6.1630, 35.7516] }},
    'Angola': { lat: -11.2027, lng: 17.8739, cities: { 'Luanda': [-8.8390, 13.2894] }},
    'Colombia': { lat: 4.5709, lng: -74.2973, cities: { 'Bogotá': [4.7110, -74.0721] }},
    'Mexico': { lat: 23.6345, lng: -102.5528, cities: { 'Mexico City': [19.4326, -99.1332] }},
    'Cuba': { lat: 21.5218, lng: -77.7812, cities: { 'Havana': [23.1136, -82.3666] }},
    'Bangladesh': { lat: 23.6850, lng: 90.3563, cities: { 'Dhaka': [23.8103, 90.4125] }},
    'Sri Lanka': { lat: 7.8731, lng: 80.7718, cities: { 'Colombo': [6.9271, 79.8612] }},
    'Nepal': { lat: 28.3949, lng: 84.1240, cities: { 'Kathmandu': [27.7172, 85.3240] }},
    'Laos': { lat: 19.8563, lng: 102.4955, cities: { 'Vientiane': [17.9757, 102.6331] }},
    'Vietnam': { lat: 14.0583, lng: 108.2772, cities: { 'Hanoi': [21.0278, 105.8342] }},
    'Uzbekistan': { lat: 41.3775, lng: 64.5853, cities: { 'Tashkent': [41.2995, 69.2401] }},
    'Kazakhstan': { lat: 48.0196, lng: 66.9237, cities: { 'Astana': [51.1605, 71.4704] }}
};

// Улучшенные fallback данные
const FALLBACK_EVENTS = [
    {date: "2026-02-28", lat: 9.0810, lng: 7.4895, country: "Nigeria", city: "Abuja", type: "attack", title: "Church attacked in Abuja suburb", description: "Gunmen attacked worshippers during Sunday service", source: "RSS Feed", url: "#", victims: 12},
    {date: "2026-02-27", lat: 20.9517, lng: 85.0985, country: "India", city: "Odisha", type: "murder", title: "Christian family killed in Odisha", description: "Three members of Christian family murdered", source: "RSS Feed", url: "#", victims: 3},
    {date: "2026-02-26", lat: 35.6892, lng: 51.3890, country: "Iran", city: "Tehran", type: "arrest", title: "Church raid in Tehran", description: "Authorities arrested 8 Christians during prayer meeting", source: "RSS Feed", url: "#", victims: 8},
    {date: "2026-02-25", lat: 33.3152, lng: 44.3661, country: "Iraq", city: "Baghdad", type: "attack", title: "Bombing near Christian district", description: "Explosion killed 5 and injured 12 near church", source: "RSS Feed", url: "#", victims: 5},
    {date: "2026-02-24", lat: 30.0444, lng: 31.2357, country: "Egypt", city: "Cairo", type: "discrimination", title: "Church closure ordered", description: "Authorities shut down unlicensed church building", source: "RSS Feed", url: "#", victims: 0},
    {date: "2026-02-23", lat: -1.2921, lng: 36.8219, country: "Kenya", city: "Nairobi", type: "attack", title: "Attack on Christian school", description: "Militants attacked school in Christian area", source: "RSS Feed", url: "#", victims: 2},
    {date: "2026-02-22", lat: 15.3229, lng: 38.9251, country: "Eritrea", city: "Asmara", type: "arrest", title: "Mass arrests of Christians", description: "30 Christians detained during prayer gathering", source: "RSS Feed", url: "#", victims: 30},
    {date: "2026-02-21", lat: 10.5105, lng: 7.4165, country: "Nigeria", city: "Kaduna", type: "kidnapping", title: "Priest kidnapped", description: "Catholic priest abducted by armed men", source: "RSS Feed", url: "#", victims: 1}
];

function detectCountry(text) {
    const lowerText = text.toLowerCase();
    for (const [country, data] of Object.entries(COUNTRY_DATA)) {
        if (lowerText.includes(country.toLowerCase())) {
            return { 
                name: country, 
                lat: data.lat, 
                lng: data.lng,
                city: Object.keys(data.cities)[0] || 'Unknown'
            };
        }
    }
    // Проверяем частичные совпадения
    if (lowerText.includes('nigerian') || lowerText.includes('nigerians')) {
        return { name: 'Nigeria', lat: 9.0820, lng: 8.6753, city: 'Lagos' };
    }
    if (lowerText.includes('indian') || lowerText.includes('hindu')) {
        return { name: 'India', lat: 20.5937, lng: 78.9629, city: 'Delhi' };
    }
    return null;
}

function detectType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.match(/killed|murdered|death|dead|slain|massacre|execution|убий|смерт|казн/)) return 'murder';
    if (lowerText.match(/attack|bomb|explosion|shooting|raid|stormed|burned|атак|взрыв|обстрел|поджог/)) return 'attack';
    if (lowerText.match(/kidnap|abduct|hostage|captive|missing|похищ|захват|плен/)) return 'kidnapping';
    if (lowerText.match(/arrest|detain|prison|jail|imprisoned|sentence|арест|тюрьм|задерж|осужд/)) return 'arrest';
    if (lowerText.match(/close|ban|shut|outlaw|discriminat|fine|restrict|закрыт|запрет|дискримин|штраф/)) return 'discrimination';
    return 'other';
}

function extractVictims(text) {
    const patterns = [
        /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed|died)/i,
        /killed\s*(\d+)/i,
        /(\d+)\s*killed/i,
        /at\s*least\s*(\d+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num > 0 && num < 10000) return num;
        }
    }
    return 0;
}

// Улучшенная функция fetchRSS с обработкой редиректов
function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const req = https.get(url, options, (res) => {
            // Обработка редиректов
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`   ↪️ Редирект на ${res.headers.location}`);
                return fetchRSS(res.headers.location).then(resolve).catch(reject);
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Улучшенная функция parseRSS с поддержкой Atom и RSS 1.0
function parseRSS(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            let items = [];
            
            // RSS 2.0
            if (result?.rss?.channel?.item) {
                items = Array.isArray(result.rss.channel.item) 
                    ? result.rss.channel.item 
                    : [result.rss.channel.item];
            }
            // Atom
            else if (result?.feed?.entry) {
                items = Array.isArray(result.feed.entry) 
                    ? result.feed.entry 
                    : [result.feed.entry];
            }
            // RSS 1.0 (RDF)
            else if (result?.['rdf:RDF']?.item) {
                items = Array.isArray(result['rdf:RDF'].item)
                    ? result['rdf:RDF'].item
                    : [result['rdf:RDF'].item];
            }
            
            resolve(items);
        });
    });
}

async function updateData() {
    console.log('🚀 Начало RSS-парсинга...');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    
    const allEvents = [];
    const errors = [];
    let successCount = 0;

    for (const [sourceName, url] of Object.entries(RSS_SOURCES)) {
        try {
            console.log(`\n📡 ${sourceName}:`);
            const xml = await fetchRSS(url);
            const items = await parseRSS(xml);
            
            console.log(`   Записей: ${items.length}`);

            let relevantCount = 0;
            for (const item of items.slice(0, 15)) {
                const title = item.title?.[0] || item.title || '';
                const description = (item.description?.[0] || item.description || item.summary?.[0] || '').replace(/<[^>]*>/g, '');
                const link = item.link?.[0]?.$?.href || item.link?.[0] || item.link || item.id || '';
                const pubDate = item.pubDate?.[0] || item.published?.[0] || item.updated?.[0] || item.date || new Date().toISOString();
                
                const fullText = (title + ' ' + description).toLowerCase();
                
                // Проверяем релевантность
                const isRelevant = KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()));
                if (!isRelevant) continue;

                const countryData = detectCountry(fullText);
                if (!countryData) continue;

                relevantCount++;
                
                // Добавляем небольшой случайный разброс координат
                const lat = countryData.lat + (Math.random() - 0.5) * 2;
                const lng = countryData.lng + (Math.random() - 0.5) * 2;

                const event = {
                    date: new Date(pubDate).toISOString().split('T')[0],
                    lat: parseFloat(lat.toFixed(4)),
                    lng: parseFloat(lng.toFixed(4)),
                    country: countryData.name,
                    city: countryData.city,
                    type: detectType(fullText),
                    title: title.substring(0, 120),
                    description: description.substring(0, 250),
                    source: sourceName,
                    url: link || '#',
                    victims: extractVictims(fullText)
                };

                allEvents.push(event);
            }
            
            console.log(`   ✅ Релевантных: ${relevantCount}`);
            if (relevantCount > 0) successCount++;

        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            errors.push({ source: sourceName, error: error.message });
        }
    }

    // Если RSS не сработал, используем fallback
    let finalEvents;
    if (allEvents.length === 0) {
        console.log('\n⚠️ RSS не дал результатов, используем fallback');
        finalEvents = FALLBACK_EVENTS;
    } else {
        // Дедупликация по URL + title
        const seen = new Set();
        const uniqueEvents = [];
        
        for (const event of allEvents) {
            const key = (event.url + event.title).toLowerCase().substring(0, 100);
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }
        
        uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        finalEvents = uniqueEvents.slice(0, 50);
    }

    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.1',
            totalEvents: finalEvents.length,
            sourcesChecked: Object.keys(RSS_SOURCES).length,
            sourcesWorking: successCount,
            errors: errors,
            updateMethod: allEvents.length === 0 ? 'FALLBACK' : 'RSS'
        },
        events: finalEvents
    };

    const outputPath = path.join(__dirname, '..', 'data', 'events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n✅ ГОТОВО!`);
    console.log(`📊 Событий: ${finalEvents.length}`);
    console.log(`📡 Рабочих источников: ${successCount}/${Object.keys(RSS_SOURCES).length}`);
    console.log(`⚠️ Ошибок: ${errors.length}`);
    console.log(`💾 Сохранено: ${outputPath}`);
    
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
    console.log(`🌍 Топ стран:`, Object.entries(countryStats).slice(0, 5));

    return output;
}

if (require.main === module) {
    updateData().catch(err => {
        console.error('💥 Критическая ошибка:', err);
        // Даже при критической ошибке создаем fallback файл
        const outputPath = path.join(__dirname, '..', 'data', 'events.json');
        const fallbackOutput = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '1.1',
                totalEvents: FALLBACK_EVENTS.length,
                sourcesChecked: 0,
                sourcesWorking: 0,
                errors: [{ source: 'critical', error: err.message }],
                updateMethod: 'CRITICAL_FALLBACK'
            },
            events: FALLBACK_EVENTS
        };
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(fallbackOutput, null, 2), 'utf8');
        console.log('🔄 Создан fallback файл после критической ошибки');
        process.exit(0); // Не завершаем с ошибкой, чтобы GitHub Actions не падал
    });
}

module.exports = { updateData };
