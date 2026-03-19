// js/sources.js — Упрощённая стабильная версия без проблемных зависимостей
const https = require('https');
const RSSParser = require('rss-parser');

class DataSourceManager {
    constructor() {
        this.parser = new RSSParser({
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        // Только RSS источники (стабильные)
        this.sources = {
            rss: {
                // Христианские новостные агентства
                vaticanNews: 'https://www.vaticannews.va/ru/church/rss.xml',
                zenit: 'https://zenit.org/feed/',
                catholicNewsAgency: 'https://www.catholicnewsagency.com/rss/news.xml',
                nationalCatholicRegister: 'https://www.ncregister.com/rss.xml',
                ewtn: 'https://www.ewtn.com/rss.xml',
                crux: 'https://cruxnow.com/feed/',
                aleteia: 'https://aleteia.org/feed/',
                catholicHerald: 'https://catholicherald.co.uk/feed/',
                
                // Правозащитные
                opendoors: 'https://www.opendoors.org/news/rss.xml',
                persecution: 'https://persecution.org/feed/',
                
                // Региональные
                christianpost: 'https://www.christianpost.com/news/world/feed/',
                christiantoday: 'https://www.christiantoday.com/rss/world.xml',
                morningstarnews: 'https://morningstarnews.org/feed/',
                barnabasfund: 'https://barnabasfund.org/rss',
                
                // Новости по странам
                nigerianews: 'https://www.vanguardngr.com/feed/',
                punchng: 'https://punchng.com/feed/',
                
                // Азия
                ucanews: 'https://www.ucanews.com/rss',
                asianews: 'https://www.asianews.it/rss.xml'
            }
        };
        
        // Ключевые слова для фильтрации
        this.keywords = {
            primary: [
                'christian', 'christians', 'church', 'churches', 'pastor', 'pastors',
                'priest', 'priests', 'congregation', 'worshippers', 'believers',
                'copt', 'copts', 'evangelical', 'protestant', 'catholic', 'orthodox',
                'house church', 'underground church', 'bible', 'persecution', 'martyr'
            ],
            actions: [
                'killed', 'murdered', 'massacred', 'slain', 'executed', 'beheaded',
                'stoned', 'burned', 'tortured', 'martyred', 'beaten', 'whipped',
                'attacked', 'ambushed', 'raided', 'stormed', 'bombed', 'shooting',
                'shot', 'kidnapped', 'abducted', 'hostage', 'ransom', 'arrested',
                'detained', 'imprisoned', 'jailed', 'sentenced', 'convicted',
                'discrimination', 'harassed', 'threatened', 'forced', 'expelled',
                'displaced', 'destroyed', 'burned down', 'torched', 'looted',
                'vandalized', 'desecrated', 'closed', 'sealed', 'demolished',
                'confiscated', 'banned', 'outlawed', 'restricted'
            ],
            countries: [
                'nigeria', 'india', 'china', 'pakistan', 'iran', 'iraq', 'syria',
                'egypt', 'eritrea', 'north korea', 'somalia', 'libya', 'afghanistan',
                'yemen', 'sudan', 'myanmar', 'burkina faso', 'mali', 'niger',
                'cameroon', 'central african republic', 'congo', 'mozambique',
                'ethiopia', 'kenya', 'uganda', 'tanzania', 'algeria', 'morocco',
                'tunisia', 'saudi arabia', 'uae', 'qatar', 'kuwait', 'bahrain',
                'oman', 'jordan', 'lebanon', 'turkey', 'bangladesh', 'sri lanka',
                'nepal', 'laos', 'vietnam', 'cambodia', 'thailand', 'malaysia',
                'indonesia', 'philippines', 'colombia', 'mexico', 'cuba', 'venezuela'
            ]
        };
        
        this.stopWords = [
            'gold price', 'bitcoin', 'crypto', 'stock market', 'wall street',
            'weather forecast', 'climate change', 'sports', 'football', 'soccer',
            'celebrity', 'hollywood', 'bollywood', 'movie', 'film', 'actor',
            'singer', 'album', 'concert', 'fashion', 'recipe', 'cooking',
            'restaurant', 'hotel', 'travel guide', 'vacation', 'tourism',
            'book review', 'this summer', 'weekend getaway', 'diy', 'how to',
            'netflix', 'streaming', 'review', 'trailer', 'premiere'
        ];
    }

    async fetchRSS(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const feed = await this.parser.parseURL(url);
                return feed.items || [];
            } catch (err) {
                if (i === retries) {
                    console.log(`   ❌ RSS failed: ${err.message.substring(0, 50)}`);
                    return [];
                }
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            }
        }
        return [];
    }

    async collectRSS() {
        const allItems = [];
        const errors = [];
        
        console.log(`\n📡 RSS Sources: ${Object.keys(this.sources.rss).length}`);
        
        for (const [name, url] of Object.entries(this.sources.rss)) {
            try {
                const items = await this.fetchRSS(url);
                console.log(`   ✅ ${name}: ${items.length} items`);
                
                items.forEach(item => {
                    allItems.push({
                        title: item.title || '',
                        description: item.contentSnippet || item.description || '',
                        url: item.link || '',
                        date: item.isoDate || item.pubDate || new Date().toISOString(),
                        source: name,
                        type: 'rss'
                    });
                });
            } catch (err) {
                errors.push({ source: name, error: err.message });
            }
            await new Promise(r => setTimeout(r, 300)); // Rate limiting
        }
        
        return { items: allItems, errors };
    }

    fetchNewsAPI(query, apiKey) {
        return new Promise((resolve) => {
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
            
            https.get(url, { headers: { 'User-Agent': 'PersecutionMap/1.0' }, timeout: 15000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.status === 'error') {
                            console.log(`   ⚠️ NewsAPI error: ${json.message}`);
                            resolve([]);
                        } else {
                            resolve(json.articles || []);
                        }
                    } catch (e) { resolve([]); }
                });
            }).on('error', () => resolve([])).on('timeout', () => resolve([]));
        });
    }

    async collectNewsAPI(apiKey) {
        if (!apiKey) {
            console.log('   ⚠️ NewsAPI key not found');
            return { items: [], errors: [] };
        }
        
        const queries = [
            'christian persecution Nigeria',
            'church attack India',
            'pastor arrested China',
            'blasphemy Pakistan',
            'coptic persecution Egypt',
            'christian killed Iraq',
            'house church Iran'
        ];
        
        const allItems = [];
        const errors = [];
        
        console.log(`\n🔑 NewsAPI: ${queries.length} queries`);
        
        for (const query of queries) {
            const articles = await this.fetchNewsAPI(query, apiKey);
            console.log(`   ✅ "${query.substring(0, 30)}...": ${articles.length} articles`);
            
            articles.forEach(article => {
                allItems.push({
                    title: article.title || '',
                    description: article.description || '',
                    url: article.url || '',
                    date: article.publishedAt || new Date().toISOString(),
                    source: `newsapi:${article.source?.name || 'unknown'}`,
                    type: 'api'
                });
            });
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
        return { items: allItems, errors };
    }

    isRelevant(item) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        
        for (const stop of this.stopWords) {
            if (text.includes(stop.toLowerCase())) return false;
        }
        
        const hasChristian = this.keywords.primary.some(k => text.includes(k.toLowerCase()));
        const hasAction = this.keywords.actions.some(k => text.includes(k.toLowerCase()));
        const hasCountry = this.keywords.countries.some(k => text.includes(k.toLowerCase()));
        
        return (hasChristian && hasAction) || (hasChristian && hasCountry);
    }

    calculateRelevanceScore(item) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        let score = 0;
        
        [...this.keywords.primary, ...this.keywords.actions].forEach(kw => {
            const matches = (text.match(new RegExp(kw, 'gi')) || []).length;
            score += matches * 2;
        });
        
        const highRisk = ['nigeria', 'pakistan', 'iran', 'north korea', 'somalia', 'libya', 'yemen'];
        highRisk.forEach(country => {
            if (text.includes(country)) score += 5;
        });
        
        if (/killed|murdered|massacred/i.test(text)) score += 3;
        if (/kidnapped|abducted/i.test(text)) score += 2;
        
        return score;
    }

    detectCountry(text) {
        const t = text.toLowerCase();
        const countries = {
            'Nigeria': ['nigeria', 'nigerian', 'lagos', 'abuja', 'kaduna', 'plateau', 'borno', 'kano'],
            'India': ['india', 'indian', 'delhi', 'mumbai', 'odisha', 'chhattisgarh', 'uttar pradesh'],
            'China': ['china', 'chinese', 'beijing', 'shanghai', 'xinjiang', 'shenzhen', 'guangdong'],
            'Pakistan': ['pakistan', 'pakistani', 'lahore', 'islamabad', 'karachi', 'peshawar'],
            'Iran': ['iran', 'iranian', 'tehran', 'isfahan', 'shiraz', 'mashhad'],
            'Iraq': ['iraq', 'iraqi', 'baghdad', 'mosul', 'erbil', 'kirkuk'],
            'Syria': ['syria', 'syrian', 'damascus', 'aleppo', 'homs'],
            'Egypt': ['egypt', 'egyptian', 'cairo', 'alexandria', 'sinai', 'minya'],
            'Eritrea': ['eritrea', 'eritrean', 'asmara'],
            'North Korea': ['north korea', 'dprk', 'pyongyang'],
            'Somalia': ['somalia', 'somali', 'mogadishu'],
            'Libya': ['libya', 'libyan', 'tripoli'],
            'Afghanistan': ['afghanistan', 'afghan', 'kabul'],
            'Yemen': ['yemen', 'yemeni', 'sanaa'],
            'Sudan': ['sudan', 'sudanese', 'khartoum'],
            'Myanmar': ['myanmar', 'burma', 'yangon', 'mandalay'],
            'Burkina Faso': ['burkina faso', 'ouagadougou'],
            'Mali': ['mali', 'malian', 'bamako'],
            'Niger': ['niger', 'niamey'],
            'Cameroon': ['cameroon', 'cameroonian', 'yaounde'],
            'Central African Republic': ['central african republic', 'bangui', 'car'],
            'Democratic Republic of the Congo': ['dr congo', 'drc', 'congo', 'kinshasa'],
            'Mozambique': ['mozambique', 'maputo', 'cabo delgado'],
            'Ethiopia': ['ethiopia', 'ethiopian', 'addis ababa'],
            'Kenya': ['kenya', 'kenyan', 'nairobi', 'mombasa'],
            'Uganda': ['uganda', 'ugandan', 'kampala'],
            'Tanzania': ['tanzania', 'tanzanian', 'dodoma'],
            'Algeria': ['algeria', 'algerian', 'algiers'],
            'Morocco': ['morocco', 'moroccan', 'rabat', 'casablanca'],
            'Tunisia': ['tunisia', 'tunisian', 'tunis'],
            'Saudi Arabia': ['saudi arabia', 'saudi', 'riyadh', 'jeddah'],
            'Bangladesh': ['bangladesh', 'bangladeshi', 'dhaka'],
            'Sri Lanka': ['sri lanka', 'colombo'],
            'Nepal': ['nepal', 'kathmandu'],
            'Laos': ['laos', 'lao', 'vientiane'],
            'Vietnam': ['vietnam', 'vietnamese', 'hanoi', 'ho chi minh'],
            'Cambodia': ['cambodia', 'cambodian', 'phnom penh'],
            'Thailand': ['thailand', 'thai', 'bangkok'],
            'Malaysia': ['malaysia', 'malaysian', 'kuala lumpur'],
            'Indonesia': ['indonesia', 'indonesian', 'jakarta'],
            'Philippines': ['philippines', 'filipino', 'manila'],
            'Colombia': ['colombia', 'colombian', 'bogota'],
            'Mexico': ['mexico', 'mexican', 'mexico city'],
            'Cuba': ['cuba', 'cuban', 'havana'],
            'Venezuela': ['venezuela', 'venezuelan', 'caracas']
        };
        
        for (const [country, terms] of Object.entries(countries)) {
            if (terms.some(term => t.includes(term))) return country;
        }
        
        return null;
    }

    detectType(text) {
        const t = text.toLowerCase();
        
        if (t.match(/killed|murdered|death|dead|slain|massacre|execution|martyred|stoned|beheaded|died/))
            return 'murder';
        if (t.match(/kidnap|abduct|hostage|captive|ransom/))
            return 'kidnapping';
        if (t.match(/arrest|detain|prison|jail|imprisoned|sentence|convicted|charged|trial/))
            return 'arrest';
        if (t.match(/close|ban|shut|outlaw|discriminat|fine|restrict|denied|demolished|confiscated|prohibited|expelled|displaced/))
            return 'discrimination';
        if (t.match(/attack|bomb|explosion|shooting|raid|stormed|burned|destroyed|gunmen|militants|terrorists|burning|torched|ambushed/))
            return 'attack';
        
        return 'other';
    }

    extractVictims(text) {
        const patterns = [
            /(\d+)\s*(?:people|persons|christians|believers|victims|dead|killed|died)/i,
            /killed\s+(\d+)/i,
            /(\d+)\s*killed/i,
            /at\s*least\s+(\d+)/i,
            /up\s*to\s+(\d+)/i,
            /(\d+)\s*dead/i,
            /(\d+)\s*christians/i,
            /(\d+)\s*members/i,
            /(\d+)\s*congregants/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const num = parseInt(match[1]);
                if (num > 0 && num < 10000) return num;
            }
        }
        
        if (/\bdozens\b/i.test(text)) return 24;
        if (/\bscores\b/i.test(text)) return 40;
        if (/\bhundreds\b/i.test(text)) return 150;
        
        return 0;
    }

    getCoordinates(country, city = null) {
        const data = {
            'Nigeria': { lat: 9.0820, lng: 8.6753, cities: {
                'Abuja': [9.0810, 7.4895], 'Lagos': [6.5244, 3.3792],
                'Kaduna': [10.5105, 7.4165], 'Plateau': [9.2182, 9.5179],
                'Borno': [11.8333, 13.1500], 'Kano': [12.0022, 8.5920]
            }},
            'India': { lat: 20.5937, lng: 78.9629, cities: {
                'Delhi': [28.7041, 77.1025], 'Mumbai': [19.0760, 72.8777],
                'Odisha': [20.9517, 85.0985], 'Chhattisgarh': [21.2787, 81.8661],
                'Uttar Pradesh': [26.8467, 80.9462]
            }},
            'China': { lat: 35.8617, lng: 104.1954, cities: {
                'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737],
                'Xinjiang': [43.7930, 87.6278], 'Guangdong': [23.3790, 113.7633]
            }},
            'Pakistan': { lat: 30.3753, lng: 69.3451, cities: {
                'Lahore': [31.5204, 74.3587], 'Islamabad': [33.6844, 73.0479],
                'Karachi': [24.8607, 67.0011], 'Peshawar': [34.0151, 71.5249]
            }},
            'Iran': { lat: 32.4279, lng: 53.6880, cities: {
                'Tehran': [35.6892, 51.3890], 'Isfahan': [32.6539, 51.6660],
                'Shiraz': [29.5926, 52.5836], 'Mashhad': [36.2605, 59.6168]
            }},
            'Iraq': { lat: 33.2232, lng: 43.6793, cities: {
                'Baghdad': [33.3152, 44.3661], 'Mosul': [36.3566, 43.1640],
                'Erbil': [36.1911, 44.0092], 'Kirkuk': [35.4669, 44.3923]
            }},
            'Syria': { lat: 34.8021, lng: 38.9968, cities: {
                'Damascus': [33.5138, 36.2765], 'Aleppo': [36.2021, 37.1343],
                'Homs': [34.7308, 36.7094]
            }},
            'Egypt': { lat: 26.8206, lng: 30.8025, cities: {
                'Cairo': [30.0444, 31.2357], 'Alexandria': [31.2001, 29.9187],
                'Minya': [28.1099, 30.7503], 'Sinai': [29.3102, 33.0938]
            }},
            'Eritrea': { lat: 15.1794, lng: 39.7823, cities: {
                'Asmara': [15.3229, 38.9251]
            }},
            'North Korea': { lat: 40.3399, lng: 127.5101, cities: {
                'Pyongyang': [39.0392, 125.7625]
            }},
            'Somalia': { lat: 5.1521, lng: 46.1996, cities: {
                'Mogadishu': [2.0469, 45.3182]
            }},
            'Libya': { lat: 26.3351, lng: 17.2283, cities: {
                'Tripoli': [32.8872, 13.1913]
            }},
            'Afghanistan': { lat: 33.9391, lng: 67.7100, cities: {
                'Kabul': [34.5553, 69.2075]
            }},
            'Yemen': { lat: 15.5527, lng: 48.5164, cities: {
                'Sanaa': [15.3694, 44.1910]
            }},
            'Sudan': { lat: 12.8628, lng: 30.2176, cities: {
                'Khartoum': [15.5007, 32.5599]
            }},
            'Myanmar': { lat: 21.9162, lng: 95.9560, cities: {
                'Yangon': [16.8661, 96.1951], 'Mandalay': [21.9162, 95.9560]
            }},
            'Burkina Faso': { lat: 12.2383, lng: -1.5616, cities: {
                'Ouagadougou': [12.3714, -1.5197]
            }},
            'Mali': { lat: 17.5707, lng: -3.9962, cities: {
                'Bamako': [12.6392, -8.0029]
            }},
            'Niger': { lat: 17.6078, lng: 8.0817, cities: {
                'Niamey': [13.5116, 2.1254]
            }},
            'Cameroon': { lat: 7.3697, lng: 12.3547, cities: {
                'Yaounde': [3.8480, 11.5021]
            }},
            'Central African Republic': { lat: 6.6111, lng: 20.9394, cities: {
                'Bangui': [4.3947, 18.5582]
            }},
            'Democratic Republic of the Congo': { lat: -4.0383, lng: 21.7587, cities: {
                'Kinshasa': [-4.4419, 15.2663]
            }},
            'Mozambique': { lat: -18.6657, lng: 35.5296, cities: {
                'Maputo': [-25.9692, 32.5732], 'Cabo Delgado': [-12.3333, 40.5000]
            }},
            'Ethiopia': { lat: 9.1450, lng: 40.4897, cities: {
                'Addis Ababa': [9.0320, 38.7469]
            }},
            'Kenya': { lat: -0.0236, lng: 37.9062, cities: {
                'Nairobi': [-1.2921, 36.8219], 'Mombasa': [-4.0435, 39.6682]
            }},
            'Uganda': { lat: 1.3733, lng: 32.2903, cities: {
                'Kampala': [0.3476, 32.5825]
            }},
            'Tanzania': { lat: -6.3690, lng: 34.8888, cities: {
                'Dodoma': [-6.1630, 35.7516]
            }},
            'Algeria': { lat: 28.0339, lng: 1.6596, cities: {
                'Algiers': [36.7538, 3.0588]
            }},
            'Morocco': { lat: 31.7917, lng: -7.0926, cities: {
                'Rabat': [34.0209, -6.8416]
            }},
            'Tunisia': { lat: 33.8869, lng: 9.5375, cities: {
                'Tunis': [36.8065, 10.1815]
            }},
            'Saudi Arabia': { lat: 23.8859, lng: 45.0792, cities: {
                'Riyadh': [24.7136, 46.6753], 'Jeddah': [21.4858, 39.1925]
            }},
            'Bangladesh': { lat: 23.6850, lng: 90.3563, cities: {
                'Dhaka': [23.8103, 90.4125]
            }},
            'Sri Lanka': { lat: 7.8731, lng: 80.7718, cities: {
                'Colombo': [6.9271, 79.8612]
            }},
            'Nepal': { lat: 28.3949, lng: 84.1240, cities: {
                'Kathmandu': [27.7172, 85.3240]
            }},
            'Laos': { lat: 19.8563, lng: 102.4955, cities: {
                'Vientiane': [17.9757, 102.6331]
            }},
            'Vietnam': { lat: 14.0583, lng: 108.2772, cities: {
                'Hanoi': [21.0278, 105.8342], 'Ho Chi Minh City': [10.8231, 106.6297]
            }},
            'Cambodia': { lat: 12.5657, lng: 104.9910, cities: {
                'Phnom Penh': [11.5564, 104.9282]
            }},
            'Thailand': { lat: 15.8700, lng: 100.9925, cities: {
                'Bangkok': [13.7563, 100.5018]
            }},
            'Malaysia': { lat: 4.2105, lng: 101.9758, cities: {
                'Kuala Lumpur': [3.1390, 101.6869]
            }},
            'Indonesia': { lat: -0.7893, lng: 113.9213, cities: {
                'Jakarta': [-6.2088, 106.8456]
            }},
            'Philippines': { lat: 12.8797, lng: 121.7740, cities: {
                'Manila': [14.5995, 120.9842]
            }},
            'Colombia': { lat: 4.5709, lng: -74.2973, cities: {
                'Bogota': [4.7110, -74.0721]
            }},
            'Mexico': { lat: 23.6345, lng: -102.5528, cities: {
                'Mexico City': [19.4326, -99.1332]
            }},
            'Cuba': { lat: 21.5218, lng: -77.7812, cities: {
                'Havana': [23.1136, -82.3666]
            }},
            'Venezuela': { lat: 6.4238, lng: -66.5897, cities: {
                'Caracas': [10.4806, -66.9036]
            }}
        };

        const countryData = data[country];
        if (!countryData) return { lat: 20, lng: 0, city: 'Unknown' };

        if (city && countryData.cities[city]) {
            const [lat, lng] = countryData.cities[city];
            return { lat, lng, city };
        }

        const cities = Object.keys(countryData.cities);
        if (cities.length > 0 && !city) {
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            const [lat, lng] = countryData.cities[randomCity];
            return { lat, lng, city: randomCity };
        }

        const lat = countryData.lat + (Math.random() - 0.5) * 2;
        const lng = countryData.lng + (Math.random() - 0.5) * 2;
        return { lat, lng, city: city || 'Unknown' };
    }

    // ИСПРАВЛЕННЫЙ МЕТОД ПЕРЕВОДА
    translateText(text, dictionary) {
        if (!text || typeof text !== 'string') return '';
        
        let result = text;
        
        // Сортируем все ключи по длине (сначала длинные, чтобы "christian community" 
        // заменилось раньше, чем просто "christian")
        const allKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
        
        // 1. Сначала заменяем многословные фразы (содержат пробел)
        const phrases = allKeys.filter(key => key.includes(' '));
        for (const phrase of phrases) {
            // Экранируем спецсимволы для RegExp
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'gi'); // g - глобально, i - без учёта регистра
            result = result.replace(regex, dictionary[phrase][0]);
        }
        
        // 2. Затем заменяем отдельные слова
        const singleWords = allKeys.filter(key => !key.includes(' '));
        const words = result.split(/\b/);
        const translated = words.map(word => {
            const lower = word.toLowerCase().trim();
            if (!lower) return word;
            
            // Если слово есть в словаре и это не фраза (уже обработали выше)
            if (singleWords.includes(lower)) {
                return dictionary[lower][0];
            }
            return word;
        });
        
        result = translated.join('');
        
        // 3. Удаляем/заменяем оставшиеся английские артикли и предлоги
        result = result
            .replace(/\bthe\b/gi, '')           // артикль the
            .replace(/\ba\b/gi, '')             // артикль a
            .replace(/\ban\b/gi, '')            // артикль an
            .replace(/\bin\b/gi, 'в')           // in → в
            .replace(/\bon\b/gi, 'на')          // on → на
            .replace(/\bat\b/gi, '')            // at → (удаляем)
            .replace(/\bby\b/gi, '')            // by → (удаляем)
            .replace(/\bwith\b/gi, 'с')         // with → с
            .replace(/\bfrom\b/gi, 'из')        // from → из
            .replace(/\bto\b/gi, '')            // to → (удаляем)
            .replace(/\bof\b/gi, '')            // of → (удаляем)
            .replace(/\band\b/gi, 'и')          // and → и
            .replace(/\bfor\b/gi, 'для')        // for → для
            .replace(/\bover\b/gi, '')          // over
            .replace(/\bafter\b/gi, 'после')    // after → после
            .replace(/\bduring\b/gi, 'во время')// during → во время
            .replace(/\bunder\b/gi, 'под')      // under → под
            .replace(/\binto\b/gi, 'в')         // into → в
            .replace(/\babout\b/gi, 'о');       // about → о
        
        // 4. Очистка лишних пробелов и знаков препинания
        result = result
            .replace(/\s+/g, ' ')               // множественные пробелы → один
            .replace(/\s+,/g, ',')              // пробел перед запятой
            .replace(/\s+\./g, '.')             // пробел перед точкой
            .replace(/,\s*,/g, ',')             // двойные запятые
            .trim();
        
        // 5. Первая буква заглавная
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        
        return result;
    }

    async collectAll(options = {}) {
        const {
            useRSS = true,
            useAPI = true,
            maxEvents = 100,
            minRelevanceScore = 3,
            apiKey = null
        } = options;
        
        console.log('🚀 Starting comprehensive data collection...\n');
        
        const allRawItems = [];
        const allErrors = [];
        
        // 1. RSS
        if (useRSS) {
            const rss = await this.collectRSS();
            allRawItems.push(...rss.items);
            allErrors.push(...rss.errors);
        }
        
        // 2. APIs
        if (useAPI && apiKey) {
            const newsapi = await this.collectNewsAPI(apiKey);
            allRawItems.push(...newsapi.items);
            allErrors.push(...newsapi.errors);
        }
        
        console.log(`\n📊 Raw items collected: ${allRawItems.length}`);
        
        // Фильтрация и обработка
        const processed = [];
        const seen = new Set();
        
        for (const item of allRawItems) {
            // Дедупликация
            const key = (item.url + item.title).substring(0, 100).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            
            // Релевантность
            if (!this.isRelevant(item)) continue;
            
            const score = this.calculateRelevanceScore(item);
            if (score < minRelevanceScore) continue;
            
            // Определение параметров
            const country = this.detectCountry(item.title + ' ' + item.description);
            if (!country) continue;
            
            const type = this.detectType(item.title + ' ' + item.description);
            const victims = this.extractVictims(item.title + ' ' + item.description);
            const coords = this.getCoordinates(country);
            
            // Формирование события
            const event = {
                date: new Date(item.date).toISOString().split('T')[0],
                lat: parseFloat((coords.lat + (Math.random() - 0.5) * 0.5).toFixed(4)),
                lng: parseFloat((coords.lng + (Math.random() - 0.5) * 0.5).toFixed(4)),
                country: country,
                city: coords.city,
                type: type,
                title: item.title.substring(0, 120),
                description: item.description.substring(0, 250),
                source: item.source,
                url: item.url,
                victims: victims,
                relevanceScore: score,
                rawTitle: item.title
            };
            
            processed.push(event);
        }
        
        // Сортировка по релевантности и дате
        processed.sort((a, b) => {
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            return new Date(b.date) - new Date(a.date);
        });
        
        // Ограничение количества
        const final = processed.slice(0, maxEvents);
        
        console.log(`\n✅ Processed events: ${final.length}`);
        console.log(`📉 Filtered out: ${allRawItems.length - processed.length}`);
        
        return {
            events: final,
            errors: allErrors,
            stats: {
                raw: allRawItems.length,
                processed: processed.length,
                final: final.length,
                byType: this.countByType(final),
                byCountry: this.countByCountry(final)
            }
        };
    }

    countByType(events) {
        const counts = {};
        events.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
        return counts;
    }

    countByCountry(events) {
        const counts = {};
        events.forEach(e => { counts[e.country] = (counts[e.country] || 0) + 1; });
        return counts;
    }
}

module.exports = DataSourceManager;
