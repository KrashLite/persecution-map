const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseString } = require('xml2js');

// RSS-источники (открытые)
const RSS_SOURCES = {
    vaticanNews: 'https://www.vaticannews.va/en/church/rss.xml',
    zenit: 'https://zenit.org/feed/',
    catholicNewsAgency: 'https://www.catholicnewsagency.com/rss/news.xml',
    // Добавьте другие открытые RSS
};

// Ключевые слова для фильтрации христианских преследований
const KEYWORDS = [
    'persecution', 'martyr', 'killed', 'church attack', 'christian',
    'гонения', 'мученик', 'церковь', 'христиан', 'убийство', 'атака'
];

// Геокодирование (упрощённое)
const COUNTRY_COORDS = {
    'Nigeria': [9.0820, 8.6753],
    'India': [20.5937, 78.9629],
    'China': [35.8617, 104.1954],
    'Iran': [32.4279, 53.6880],
    'Pakistan': [30.3753, 69.3451],
    'Egypt': [26.8206, 30.8025],
    'Syria': [34.8021, 38.9968],
    'Iraq': [33.2232, 43.6793],
    'Turkey': [38.9637, 35.2433],
    'Indonesia': [-0.7893, 113.9213],
    'Myanmar': [21.9162, 95.9560],
    'Sudan': [12.8628, 30.2176],
    'Eritrea': [15.1794, 39.7823],
    'North Korea': [40.3399, 127.5101],
    'Somalia': [5.1521, 46.1996],
    'Libya': [26.3351, 17.2283],
    'Afghanistan': [33.9391, 67.7100],
    'Yemen': [15.5527, 48.5164],
    'Saudi Arabia': [23.8859, 45.0792],
    'Maldives': [3.2028, 73.2207],
    'Mauritania': [21.0079, -10.9408],
    'Morocco': [31.7917, -7.0926],
    'Algeria': [28.0339, 1.6596],
    'Tunisia': [33.8869, 9.5375],
    'Uzbekistan': [41.3775, 64.5853],
    'Turkmenistan': [38.9697, 59.5563],
    'Kazakhstan': [48.0196, 66.9237],
    'Kyrgyzstan': [41.2044, 74.7661],
    'Tajikistan': [38.8610, 71.2761],
    'Azerbaijan': [40.1431, 47.5769],
    'Bangladesh': [23.6850, 90.3563],
    'Sri Lanka': [7.8731, 80.7718],
    'Nepal': [28.3949, 84.1240],
    'Bhutan': [27.5142, 90.4336],
    'Laos': [19.8563, 102.4955],
    'Vietnam': [14.0583, 108.2772],
    'Cuba': [21.5218, -77.7812],
    'Colombia': [4.5709, -74.2973],
    'Mexico': [23.6345, -102.5528],
    'Central African Republic': [6.6111, 20.9394],
    'Mali': [17.5707, -3.9962],
    'Burkina Faso': [12.2383, -1.5616],
    'Niger': [17.6078, 8.0817],
    'Chad': [15.4542, 18.7322],
    'Cameroon': [7.3697, 12.3547],
    'Ethiopia': [9.1450, 40.4897],
    'Tanzania': [-6.3690, 34.8888],
    'Kenya': [-0.0236, 37.9062],
    'Uganda': [1.3733, 32.2903],
    'Democratic Republic of the Congo': [-4.0383, 21.7587],
    'Mozambique': [-18.6657, 35.5296],
    'Angola': [-11.2027, 17.8739],
    'Nigeria': [9.0820, 8.6753],
    'India': [20.5937, 78.9629]
};

function detectCountry(text) {
    const lowerText = text.toLowerCase();
    for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
        if (lowerText.includes(country.toLowerCase())) {
            return { name: country, coords };
        }
    }
    return null;
}

function detectType(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.match(/killed|murdered|death|dead|убий|смерт|казн/)) return 'murder';
    if (lowerText.match(/attack|bomb|explosion|shooting|атак|взрыв|обстрел/)) return 'attack';
    if (lowerText.match(/kidnap|abduct|hostage|похищ|захват/)) return 'kidnapping';
    if (lowerText.match(/arrest|detain|prison|jail|арест|тюрьм|задерж/)) return 'arrest';
    if (lowerText.match(/close|ban|shut|discriminat|закрыт|запрет|дискримин/)) return 'discrimination';
    return 'other';
}

function extractVictims(text) {
    const match = text.match(/(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed)/i);
    return match ? parseInt(match[1]) : 0;
}

async function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function parseRSS(xml) {
    return new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
            if (err) reject(err);
            else resolve(result?.rss?.channel?.[0]?.item || []);
        });
    });
}

async function updateData() {
    console.log('🚀 Начало обновления данных...');
    const allEvents = [];
    const errors = [];

    for (const [sourceName, url] of Object.entries(RSS_SOURCES)) {
        try {
            console.log(`📡 Загрузка: ${sourceName}`);
            const xml = await fetchRSS(url);
            const items = await parseRSS(xml);
            
            console.log(`   Найдено записей: ${items.length}`);

            for (const item of items.slice(0, 10)) {
                const title = item.title?.[0] || '';
                const description = item.description?.[0] || '';
                const link = item.link?.[0] || '';
                const pubDate = item.pubDate?.[0] || new Date().toISOString();
                
                const fullText = (title + ' ' + description).toLowerCase();
                
                // Проверяем релевантность
                const isRelevant = KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()));
                if (!isRelevant) continue;

                const countryData = detectCountry(fullText);
                if (!countryData) continue;

                const event = {
                    date: new Date(pubDate).toISOString().split('T')[0],
                    lat: countryData.coords[0] + (Math.random() - 0.5) * 2, // Небольшой разброс
                    lng: countryData.coords[1] + (Math.random() - 0.5) * 2,
                    country: countryData.name,
                    city: 'Unknown',
                    type: detectType(fullText),
                    title: title.substring(0, 100),
                    description: description.replace(/<[^>]*>/g, '').substring(0, 200),
                    source: sourceName,
                    url: link,
                    victims: extractVictims(fullText)
                };

                allEvents.push(event);
            }
        } catch (error) {
            console.error(`   ❌ Ошибка ${sourceName}:`, error.message);
            errors.push({ source: sourceName, error: error.message });
        }
    }

    // Дедупликация по URL
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.url, e])).values());
    uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Ограничиваем 50 событиями
    const finalEvents = uniqueEvents.slice(0, 50);

    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.0',
            totalEvents: finalEvents.length,
            sourcesChecked: Object.keys(RSS_SOURCES),
            errors: errors
        },
        events: finalEvents
    };

    const outputPath = path.join(__dirname, '..', 'data', 'events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n✅ Готово! Событий: ${finalEvents.length}`);
    console.log(`⚠️ Ошибок: ${errors.length}`);
    
    return output;
}

if (require.main === module) {
    updateData().catch(console.error);
}

module.exports = { updateData };
