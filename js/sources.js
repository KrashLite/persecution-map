// js/sources.js — Универсальный сборщик данных из множества источников
const axios = require('axios');
const cheerio = require('cheerio');
const RSSParser = require('rss-parser');
const { JSDOM } = require('jsdom');

class DataSourceManager {
    constructor() {
        this.parser = new RSSParser({
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        // Существующие + новые источники
        this.sources = {
            // === RSS источники (существующие + новые) ===
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
                
                // Новые: Международные правозащитные
                opendoors: 'https://www.opendoors.org/news/rss.xml',
                persecution: 'https://persecution.org/feed/',
                cswnigeria: 'https://www.csw.org.uk/category/nigeria/feed/',
                cswpakistan: 'https://www.csw.org.uk/category/pakistan/feed/',
                cswchina: 'https://www.csw.org.uk/category/china/feed/',
                cswindia: 'https://www.csw.org.uk/category/india/feed/',
                
                // Новые: Региональные христианские
                christianpost: 'https://www.christianpost.com/news/world/feed/',
                christiantoday: 'https://www.christiantoday.com/rss/world.xml',
                evangelicalfocus: 'https://evangelicalfocus.com/rss',
                missionnetworknews: 'https://mnnonline.org/feed/',
                morningstarnews: 'https://morningstarnews.org/feed/',
                barnabasfund: 'https://barnabasfund.org/rss',
                
                // Новые: Новости по странам
                nigerianews: 'https://www.vanguardngr.com/feed/',
                punchng: 'https://punchng.com/feed/',
                dailypostng: 'https://dailypost.ng/feed/',
                premiumtimesng: 'https://www.premiumtimesng.com/feed/',
                
                // Новые: Азия
                ucanews: 'https://www.ucanews.com/rss',
                asianews: 'https://www.asianews.it/rss.xml',
                
                // Новые: Ближний Восток
                middleeasteye: 'https://www.middleeasteye.net/rss',
                almonitor: 'https://www.al-monitor.com/rss',
                
                // Новые: Общие религиозные
                religionnews: 'https://religionnews.com/feed/',
                rns: 'https://religionnews.com/feed/',
                worldreligionnews: 'https://worldreligionnews.com/feed/'
            },
            
            // === API источники ===
            api: {
                // NewsAPI (существующий)
                newsapi: {
                    url: 'https://newsapi.org/v2/everything',
                    key: process.env.NEWS_API_KEY,
                    queries: [
                        'christian persecution Nigeria',
                        'church attack India',
                        'pastor arrested China',
                        'blasphemy Pakistan',
                        'coptic persecution Egypt',
                        'christian killed Iraq',
                        'house church Iran',
                        'religious freedom violation'
                    ]
                },
                
                // Новый: GDELT Project (бесплатный, не требует ключа)
                gdelt: {
                    url: 'https://api.gdeltproject.org/api/v2/doc/doc',
                    params: {
                        query: 'christian persecution',
                        mode: 'artlist',
                        maxrecords: 50,
                        format: 'json'
                    }
                },
                
                // Новый: Event Registry (требует ключ, есть бесплатный tier)
                eventregistry: {
                    url: 'https://eventregistry.org/api/v1/article/getArticles',
                    key: process.env.EVENT_REGISTRY_KEY
                }
            },
            
            // === Web scraping источники ===
            web: {
                // Мониторинг гонений (специализированные сайты)
                opendoorsusa: {
                    url: 'https://www.opendoorsusa.org/christian-persecution/stories/',
                    selector: '.story-card'
                },
                persecutionorg: {
                    url: 'https://persecution.org/category/news/',
                    selector: 'article.post'
                },
                worldwatchmonitor: {
                    url: 'https://www.worldwatchmonitor.org/news/',
                    selector: '.news-item'
                },
                
                // Правозащитные организации
                hrw: {
                    url: 'https://www.hrw.org/news?theme=religious-freedom',
                    selector: '.article-summary'
                },
                amnesty: {
                    url: 'https://www.amnesty.org/en/search/?q=christian+persecution',
                    selector: '.search-result'
                },
                uscirf: {
                    url: 'https://www.uscirf.gov/news-room',
                    selector: '.views-row'
                }
            },
            
            // === Социальные сети и мессенджеры ===
            social: {
                // Telegram каналы (через RSS боты или API)
                telegram: {
                    // Нужен bot token и chat_id
                    channels: [
                        '@christian_persecution_news',
                        '@religious_freedom_watch'
                    ]
                }
            }
        };
        
        // Ключевые слова для фильтрации (расширенный список)
        this.keywords = {
            // Существующие
            primary: [
                'christian', 'christians', 'church', 'churches', 'pastor', 'pastors',
                'priest', 'priests', 'congregation', 'worshippers', 'believers',
                'copt', 'copts', 'evangelical', 'protestant', 'catholic', 'orthodox',
                'house church', 'underground church', 'bible', 'persecution', 'martyr'
            ],
            
            // Новые: Действия
            actions: [
                'killed', 'murdered', 'massacred', 'slain', 'executed', 'beheaded',
                'stoned', 'burned', 'tortured', 'martyred', 'beaten', 'whipped',
                'attacked', 'ambushed', 'raided', 'stormed', 'bombed', 'shooting',
                'shot', 'kidnapped', 'abducted', 'hostage', 'ransom', 'arrested',
                'detained', 'imprisoned', 'jailed', 'sentenced', 'convicted',
                'charged', 'interrogated', 'discrimination', 'harassed', 'threatened',
                'forced', 'coerced', 'expelled', 'displaced', 'destroyed', 'burned down',
                'torched', 'looted', 'vandalized', 'desecrated', 'closed', 'sealed',
                'demolished', 'razed', 'confiscated', 'banned', 'outlawed', 'restricted'
            ],
            
            // Новые: Группы
            groups: [
                'isis', 'islamic state', 'boko haram', 'al-qaeda', 'taliban',
                'fulani', 'herdsmen', 'militia', 'mob', 'radicals', 'extremists',
                'insurgents', 'rebels', 'terrorists'
            ],
            
            // Новые: Страны (для дополнительной фильтрации)
            countries: [
                'nigeria', 'india', 'china', 'pakistan', 'iran', 'iraq', 'syria',
                'egypt', 'eritrea', 'north korea', 'somalia', 'libya', 'afghanistan',
                'yemen', 'sudan', 'myanmar', 'burkina faso', 'mali', 'niger',
                'cameroon', 'central african republic', 'congo', 'mozambique',
                'ethiopia', 'kenya', 'uganda', 'tanzania', 'algeria', 'morocco',
                'tunisia', 'mauritania', 'saudi arabia', 'uae', 'qatar', 'kuwait',
                'bahrain', 'oman', 'jordan', 'lebanon', 'turkey', 'azerbaijan',
                'turkmenistan', 'uzbekistan', 'tajikistan', 'kyrgyzstan',
                'kazakhstan', 'maldives', 'brunei', 'bangladesh', 'sri lanka',
                'nepal', 'laos', 'vietnam', 'cambodia', 'thailand', 'malaysia',
                'indonesia', 'philippines', 'papua new guinea', 'fiji',
                'colombia', 'mexico', 'cuba', 'venezuela', 'nicaragua', 'cuba'
            ]
        };
        
        // Стоп-слова (расширенные)
        this.stopWords = [
            'gold price', 'bitcoin', 'crypto', 'cryptocurrency', 'stock market',
            'wall street', 'weather forecast', 'climate change', 'global warming',
            'sports', 'football', 'soccer', 'basketball', 'baseball', 'cricket',
            'tennis', 'olympics', 'world cup', 'celebrity', 'hollywood', 'bollywood',
            'movie', 'film', 'actor', 'actress', 'singer', 'album', 'concert',
            'fashion', 'beauty', 'makeup', 'recipe', 'cooking', 'restaurant',
            'hotel', 'travel guide', 'vacation', 'tourism', 'book review',
            'couldn\'t put down', 'this summer', 'weekend getaway', 'diy',
            'how to', 'tips for', 'ways to', 'reasons why', 'the best',
            'the worst', 'ranked', 'vs', 'versus', 'compared', 'analysis',
            'opinion', 'editorial', 'letter to', 'guest column', 'sponsored',
            'advertisement', 'promoted', 'paid content', 'festival', 'documentary',
            'debut', 'directorial', 'oscar', 'binoche', 'netflix', 'streaming',
            'review', 'rating', 'stars', 'out of 10', 'trailer', 'premiere'
        ];
    }
    
    // ==================== RSS СБОР ====================
    
    async fetchRSS(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const feed = await this.parser.parseURL(url);
                return feed.items || [];
            } catch (err) {
                if (i === retries) {
                    console.log(`   ❌ RSS failed after ${retries + 1} attempts: ${err.message}`);
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
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 500));
        }
        
        return { items: allItems, errors };
    }
    
    // ==================== API СБОР ====================
    
    async collectNewsAPI() {
        const { url, key, queries } = this.sources.api.newsapi;
        if (!key) {
            console.log('   ⚠️ NewsAPI key not found');
            return { items: [], errors: [{ source: 'newsapi', error: 'No API key' }] };
        }
        
        const allItems = [];
        const errors = [];
        
        console.log(`\n🔑 NewsAPI: ${queries.length} queries`);
        
        for (const query of queries.slice(0, 5)) { // Limit to prevent rate limiting
            try {
                const response = await axios.get(url, {
                    params: {
                        q: query,
                        language: 'en',
                        sortBy: 'publishedAt',
                        pageSize: 20,
                        apiKey: key
                    },
                    timeout: 15000
                });
                
                const articles = response.data.articles || [];
                console.log(`   ✅ "${query}": ${articles.length} articles`);
                
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
                
                await new Promise(r => setTimeout(r, 1000)); // Rate limit
            } catch (err) {
                errors.push({ source: 'newsapi', query, error: err.message });
            }
        }
        
        return { items: allItems, errors };
    }
    
    async collectGDELT() {
        // GDELT — бесплатный источник, не требует ключа
        const { url, params } = this.sources.api.gdelt;
        const allItems = [];
        
        try {
            const response = await axios.get(url, {
                params: {
                    ...params,
                    query: 'christian persecution'
                },
                timeout: 20000
            });
            
            // GDELT возвращает список статей
            const articles = response.data || [];
            console.log(`   ✅ GDELT: ${articles.length} articles`);
            
            articles.forEach(article => {
                allItems.push({
                    title: article.title || '',
                    description: article.seen || '',
                    url: article.url || '',
                    date: article.seendate || new Date().toISOString(),
                    source: `gdelt:${article.domain || 'unknown'}`,
                    type: 'api'
                });
            });
        } catch (err) {
            return { items: [], errors: [{ source: 'gdelt', error: err.message }] };
        }
        
        return { items: allItems, errors: [] };
    }
    
    // ==================== WEB SCRAPING ====================
    
    async scrapeWebsite(name, config) {
        try {
            const response = await axios.get(config.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            const dom = new JSDOM(response.data);
            const document = dom.window.document;
            const elements = document.querySelectorAll(config.selector);
            
            const items = [];
            elements.forEach(el => {
                const title = el.querySelector('h2, h3, h4, .title, a')?.textContent || '';
                const link = el.querySelector('a')?.href || '';
                const desc = el.querySelector('.excerpt, .summary, p')?.textContent || '';
                
                if (title) {
                    items.push({
                        title: title.trim(),
                        description: desc.trim(),
                        url: link.startsWith('http') ? link : new URL(link, config.url).href,
                        date: new Date().toISOString(),
                        source: `web:${name}`,
                        type: 'web'
                    });
                }
            });
            
            console.log(`   ✅ ${name}: ${items.length} items`);
            return { items, errors: [] };
        } catch (err) {
            return { items: [], errors: [{ source: name, error: err.message }] };
        }
    }
    
    async collectWeb() {
        const allItems = [];
        const errors = [];
        
        console.log(`\n🌐 Web Scraping: ${Object.keys(this.sources.web).length} sources`);
        
        // Параллельно, но с ограничением
        const batchSize = 3;
        const entries = Object.entries(this.sources.web);
        
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(([name, config]) => this.scrapeWebsite(name, config))
            );
            
            results.forEach(result => {
                allItems.push(...result.items);
                errors.push(...result.errors);
            });
            
            await new Promise(r => setTimeout(r, 2000)); // Rate limiting between batches
        }
        
        return { items: allItems, errors };
    }
    
    // ==================== ФИЛЬТРАЦИЯ И ОБРАБОТКА ====================
    
    isRelevant(item) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        
        // Проверка стоп-слов
        for (const stop of this.stopWords) {
            if (text.includes(stop.toLowerCase())) return false;
        }
        
        // Проверка ключевых слов
        const hasChristian = this.keywords.primary.some(k => text.includes(k.toLowerCase()));
        const hasAction = this.keywords.actions.some(k => text.includes(k.toLowerCase()));
        const hasCountry = this.keywords.countries.some(k => text.includes(k.toLowerCase()));
        
        // Должно быть: христиане + действие, или христиане + страна
        return (hasChristian && hasAction) || (hasChristian && hasCountry);
    }
    
    calculateRelevanceScore(item) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        let score = 0;
        
        // Чем больше ключевых слов — тем выше релевантность
        [...this.keywords.primary, ...this.keywords.actions].forEach(kw => {
            const matches = (text.match(new RegExp(kw, 'gi')) || []).length;
            score += matches * 2;
        });
        
        // Бонус за конкретные страны с высоким уровнем гонений
        const highRisk = ['nigeria', 'pakistan', 'iran', 'north korea', 'somalia', 'libya', 'yemen'];
        highRisk.forEach(country => {
            if (text.includes(country)) score += 5;
        });
        
        // Бонус за конкретные действия
        if (/killed|murdered|massacred/i.test(text)) score += 3;
        if (/kidnapped|abducted/i.test(text)) score += 2;
        
        return score;
    }
    
    // ==================== ГЕОКОДИРОВАНИЕ ====================
    
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
            'Myanmar': ['myanmar', 'burma', 'burmese', 'yangon', 'mandalay'],
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
            'Mauritania': ['mauritania', 'nouakchott'],
            'Saudi Arabia': ['saudi arabia', 'saudi', 'riyadh', 'jeddah'],
            'United Arab Emirates': ['uae', 'dubai', 'abu dhabi'],
            'Qatar': ['qatar', 'qatari', 'doha'],
            'Kuwait': ['kuwait', 'kuwait city'],
            'Bahrain': ['bahrain', 'manama'],
            'Oman': ['oman', 'omani', 'muscat'],
            'Jordan': ['jordan', 'jordanian', 'amman'],
            'Lebanon': ['lebanon', 'lebanese', 'beirut'],
            'Turkey': ['turkey', 'turkish', 'istanbul', 'ankara'],
            'Azerbaijan': ['azerbaijan', 'baku'],
            'Turkmenistan': ['turkmenistan', 'ashgabat'],
            'Uzbekistan': ['uzbekistan', 'uzbek', 'tashkent'],
            'Tajikistan': ['tajikistan', 'dushanbe'],
            'Kyrgyzstan': ['kyrgyzstan', 'bishkek'],
            'Kazakhstan': ['kazakhstan', 'kazakh', 'astana'],
            'Maldives': ['maldives', 'male'],
            'Brunei': ['brunei', 'bandar seri begawan'],
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
            'Papua New Guinea': ['papua new guinea', 'port moresby'],
            'Fiji': ['fiji', 'suva'],
            'Colombia': ['colombia', 'colombian', 'bogota'],
            'Mexico': ['mexico', 'mexican', 'mexico city'],
            'Cuba': ['cuba', 'cuban', 'havana'],
            'Venezuela': ['venezuela', 'venezuelan', 'caracas'],
            'Nicaragua': ['nicaragua', 'managua'],
            'Russia': ['russia', 'russian', 'moscow', 'chechnya', 'dagestan']
        };
        
        for (const [country, terms] of Object.entries(countries)) {
            if (terms.some(term => t.includes(term))) return country;
        }
        
        return null;
    }
    
    detectType(text) {
        const t = text.toLowerCase();
        
        // Приоритет: убийство > похищение > арест > дискриминация > атака > другое
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
        
        // Специальные случаи
        if (/\bdozens\b/i.test(text)) return 24;
        if (/\bscores\b/i.test(text)) return 40;
        if (/\bhundreds\b/i.test(text)) return 150;
        
        return 0;
    }
    
    // ==================== КООРДИНАТЫ ====================
    
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
                'Uttar Pradesh': [26.8467, 80.9462], 'Karnataka': [15.3173, 75.7139]
            }},
            'China': { lat: 35.8617, lng: 104.1954, cities: {
                'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737],
                'Xinjiang': [43.7930, 87.6278], 'Guangdong': [23.3790, 113.7633],
                'Shenzhen': [22.5431, 114.0579], 'Chengdu': [30.5728, 104.0668]
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
                'Homs': [34.7308, 36.7094], 'Al-Hasakah': [36.5021, 40.7472]
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
            'Mauritania': { lat: 21.0079, lng: -10.9408, cities: {
                'Nouakchott': [18.0735, -15.9582]
            }},
            'Saudi Arabia': { lat: 23.8859, lng: 45.0792, cities: {
                'Riyadh': [24.7136, 46.6753], 'Jeddah': [21.4858, 39.1925]
            }},
            'United Arab Emirates': { lat: 23.4241, lng: 53.8478, cities: {
                'Dubai': [25.2048, 55.2708], 'Abu Dhabi': [24.4539, 54.3773]
            }},
            'Qatar': { lat: 25.3548, lng: 51.1839, cities: {
                'Doha': [25.2854, 51.5310]
            }},
            'Kuwait': { lat: 29.3117, lng: 47.4818, cities: {
                'Kuwait City': [29.3759, 47.9774]
            }},
            'Bahrain': { lat: 26.0667, lng: 50.5577, cities: {
                'Manama': [26.2285, 50.5860]
            }},
            'Oman': { lat: 21.4735, lng: 55.9754, cities: {
                'Muscat': [23.5859, 58.4059]
            }},
            'Jordan': { lat: 30.5852, lng: 36.2384, cities: {
                'Amman': [31.9454, 35.9284]
            }},
            'Lebanon': { lat: 33.8547, lng: 35.8623, cities: {
                'Beirut': [33.8938, 35.5018]
            }},
            'Turkey': { lat: 38.9637, lng: 35.2433, cities: {
                'Istanbul': [41.0082, 28.9784], 'Ankara': [39.9334, 32.8597]
            }},
            'Azerbaijan': { lat: 40.1431, lng: 47.5769, cities: {
                'Baku': [40.4093, 49.8671]
            }},
            'Turkmenistan': { lat: 38.9697, lng: 59.5563, cities: {
                'Ashgabat': [37.9601, 58.3261]
            }},
            'Uzbekistan': { lat: 41.3775, lng: 64.5853, cities: {
                'Tashkent': [41.2995, 69.2401]
            }},
            'Tajikistan': { lat: 38.8610, lng: 71.2761, cities: {
                'Dushanbe': [38.5598, 68.7870]
            }},
            'Kyrgyzstan': { lat: 41.2044, lng: 74.7661, cities: {
                'Bishkek': [42.8746, 74.5698]
            }},
            'Kazakhstan': { lat: 48.0196, lng: 66.9237, cities: {
                'Astana': [51.1605, 71.4704]
            }},
            'Maldives': { lat: 3.2028, lng: 73.2207, cities: {
                'Male': [4.1755, 73.5093]
            }},
            'Brunei': { lat: 4.5353, lng: 114.7277, cities: {
                'Bandar Seri Begawan': [4.9031, 114.9398]
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
            'Papua New Guinea': { lat: -6.314993, lng: 143.95555, cities: {
                'Port Moresby': [-9.4438, 147.1803]
            }},
            'Fiji': { lat: -16.5782, lng: 179.4141, cities: {
                'Suva': [-18.1248, 178.4501]
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
            }},
            'Nicaragua': { lat: 12.8654, lng: -85.2072, cities: {
                'Managua': [12.1140, -86.2362]
            }},
            'Russia': { lat: 61.5240, lng: 105.3188, cities: {
                'Moscow': [55.7558, 37.6173], 'Chechnya': [43.4022, 45.7188]
            }}
        };
        
        const countryData = data[country];
        if (!countryData) return { lat: 20, lng: 0, city: 'Unknown' };
        
        // Если город указан и есть в списке — используем его
        if (city && countryData.cities[city]) {
            const [lat, lng] = countryData.cities[city];
            return { lat, lng, city };
        }
        
        // Иначе — случайный город или центр страны с небольшим разбросом
        const cities = Object.keys(countryData.cities);
        if (cities.length > 0 && !city) {
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            const [lat, lng] = countryData.cities[randomCity];
            return { lat, lng, city: randomCity };
        }
        
        // Разброс от центра страны
        const lat = countryData.lat + (Math.random() - 0.5) * 2;
        const lng = countryData.lng + (Math.random() - 0.5) * 2;
        return { lat, lng, city: city || 'Unknown' };
    }
    
    // ==================== ПЕРЕВОД ====================
    
    // Используем существующий словарь из news-api.js
    translateText(text, dictionary) {
        if (!text || text.length < 3) return '';
        
        let result = text;
        
        // Простая замена по словарю
        const words = result.split(/\b/);
        const translated = words.map(word => {
            const lower = word.toLowerCase();
            if (dictionary[lower]) {
                // Выбираем именительный падеж (первый элемент)
                return dictionary[lower][0];
            }
            return word;
        });
        
        result = translated.join('');
        
        // Пост-обработка
        result = result.replace(/\s+/g, ' ').trim();
        result = result.charAt(0).toUpperCase() + result.slice(1);
        
        return result;
    }
    
    // ==================== ОСНОВНОЙ МЕТОД СБОРА ====================
    
    async collectAll(options = {}) {
        const {
            useRSS = true,
            useAPI = true,
            useWeb = false, // Web scraping требует дополнительных зависимостей
            maxEvents = 100,
            minRelevanceScore = 3
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
        if (useAPI) {
            const newsapi = await this.collectNewsAPI();
            allRawItems.push(...newsapi.items);
            allErrors.push(...newsapi.errors);
            
            const gdelt = await this.collectGDELT();
            allRawItems.push(...gdelt.items);
            allErrors.push(...gdelt.errors);
        }
        
        // 3. Web scraping (опционально)
        if (useWeb) {
            const web = await this.collectWeb();
            allRawItems.push(...web.items);
            allErrors.push(...web.errors);
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
                rawTitle: item.title // для перевода
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
        
        console.log(`✅ Processed events: ${final.length}`);
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
