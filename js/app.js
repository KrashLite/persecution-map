// app.js — Карта гонений на христиан (совместимый с fallback-data.js)

// ============ КОНФИГУРАЦИЯ ============
const CONFIG = {
    mapCenter: [20, 0],
    mapZoom: 2,
    maxEvents: 50,
    dataUrl: 'data/events.json' // ← Путь к файлу от fallback-data.js
};

// ============ ТИПЫ СОБЫТИЙ (РУССКИЕ) ============
const EVENT_TYPES = {
    'убийство': { color: '#e74c3c', label: 'Убийства' },
    'нападение': { color: '#e67e22', label: 'Атаки' },
    'похищение': { color: '#f39c12', label: 'Похищения' },
    'арест': { color: '#9b59b6', label: 'Аресты' },
    'дискриминация': { color: '#3498db', label: 'Дискриминация' },
    'другое': { color: '#95a5a6', label: 'Другое' }
};

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let map;
let markers = [];
let eventsData = [];
let currentFilter = 'все';

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚀 Инициализация карты...');
    initMap();
    await loadEvents();
    createFilterButtons();
    createLegend();
    applyFilter('все');
}

// ============ КАРТА ============
function initMap() {
    map = L.map('map').setView(CONFIG.mapCenter, CONFIG.mapZoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    console.log('✅ Карта инициализирована');
}

// ============ ЗАГРУЗКА ДАННЫХ ============
async function loadEvents() {
    try {
        console.log(`📡 Загрузка данных из ${CONFIG.dataUrl}...`);
        
        const response = await fetch(CONFIG.dataUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Получены данные:', data);
        
        // Проверяем структуру данных (fallback-data.js создает {metadata, events})
        if (data.events && Array.isArray(data.events)) {
            eventsData = data.events;
            console.log(`✅ Загружено ${eventsData.length} событий из events.json`);
        } else if (Array.isArray(data)) {
            // Если пришел просто массив
            eventsData = data;
            console.log(`✅ Загружено ${eventsData.length} событий (массив)`);
        } else {
            throw new Error('Неверная структура данных');
        }
        
        // Проверяем типы
        const types = [...new Set(eventsData.map(e => e.type))];
        console.log('📋 Типы событий:', types);
        
        // Проверяем, все ли типы известны
        types.forEach(type => {
            if (!EVENT_TYPES[type]) {
                console.warn(`⚠️ Неизвестный тип: "${type}"`);
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        console.log('🔄 Попытка загрузить fallback напрямую...');
        
        // Если файл не найден — используем встроенный fallback
        eventsData = getInlineFallback();
        console.log(`✅ Используем встроенный fallback: ${eventsData.length} событий`);
    }
    
    // Нормализуем данные (убираем лишние пробелы и т.д.)
    eventsData = eventsData.map(event => ({
        ...event,
        type: (event.type || 'другое').toString().trim().toLowerCase(),
        lat: parseFloat(event.lat),
        lng: parseFloat(event.lng)
    }));
}

// ============ ВСТРОЕННЫЙ FALLBACK (на случай если файл не доступен) ============
function getInlineFallback() {
    return [
        {
            date: "2026-02-28",
            lat: 9.0810,
            lng: 7.4895,
            country: "Нигерия",
            city: "Абуджа",
            type: "нападение",
            title: "Нападение на церковь в пригороде Абуджи",
            description: "Вооруженные люди атаковали прихожан во время воскресной службы.",
            source: "Fallback",
            victims: 12
        },
        {
            date: "2026-02-27",
            lat: 20.9517,
            lng: 85.0985,
            country: "Индия",
            city: "Одиша",
            type: "убийство",
            title: "Убийство христианской семьи",
            description: "Три члена семьи были убиты.",
            source: "Fallback",
            victims: 3
        },
        {
            date: "2026-02-26",
            lat: 35.6892,
            lng: 51.3890,
            country: "Иран",
            city: "Тегеран",
            type: "арест",
            title: "Рейд на церковь",
            description: "Арестованы 8 христиан.",
            source: "Fallback",
            victims: 8
        },
        {
            date: "2026-02-25",
            lat: 33.3152,
            lng: 44.3661,
            country: "Ирак",
            city: "Багдад",
            type: "нападение",
            title: "Взрыв возле церкви",
            description: "Погибли 5 человек.",
            source: "Fallback",
            victims: 5
        },
        {
            date: "2026-02-24",
            lat: 30.0444,
            lng: 31.2357,
            country: "Египет",
            city: "Каир",
            type: "дискриминация",
            title: "Закрытие церкви",
            description: "Власти закрыли церковное здание.",
            source: "Fallback",
            victims: 0
        }
    ];
}

// ============ ФИЛЬТРЫ ============
function createFilterButtons() {
    const container = document.getElementById('filter-buttons');
    if (!container) {
        console.error('❌ Не найден #filter-buttons');
        return;
    }
    
    container.innerHTML = '';
    
    // Кнопка "Все"
    const allBtn = createFilterButton('все', 'Все', '#2c3e50', true);
    container.appendChild(allBtn);
    
    // Кнопки типов
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return;
        const btn = createFilterButton(type, config.label, config.color, false);
        container.appendChild(btn);
    });
    
    console.log('✅ Кнопки фильтров созданы');
}

function createFilterButton(type, label, color, isActive) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.dataset.type = type;
    btn.textContent = label;
    
    btn.style.cssText = `
        padding: 8px 16px;
        margin: 4px;
        border: 2px solid ${color};
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 14px;
        background-color: ${isActive ? color : 'transparent'};
        color: ${isActive ? '#fff' : color};
    `;
    
    btn.addEventListener('click', () => {
        // Сброс активности
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
            const bType = b.dataset.type;
            const bColor = bType === 'все' ? '#2c3e50' : (EVENT_TYPES[bType]?.color || '#95a5a6');
            b.style.backgroundColor = 'transparent';
            b.style.color = bColor;
        });
        
        // Активируем текущую
        btn.classList.add('active');
        btn.style.backgroundColor = color;
        btn.style.color = '#fff';
        
        applyFilter(type);
    });
    
    return btn;
}

// ============ ПРИМЕНЕНИЕ ФИЛЬТРА ============
function applyFilter(filterType) {
    currentFilter = filterType;
    clearMarkers();
    
    const filtered = filterType === 'все' 
        ? eventsData 
        : eventsData.filter(e => e.type === filterType);
    
    console.log(`🔍 Фильтр: "${filterType}", найдено: ${filtered.length}`);
    
    filtered.forEach(event => addMarker(event));
    updateEventList(filtered);
    updateStats(filtered);
}

// ============ МАРКЕРЫ ============
function addMarker(event) {
    const color = EVENT_TYPES[event.type]?.color || EVENT_TYPES['другое'].color;
    
    const marker = L.circleMarker([event.lat, event.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    const popupContent = `
        <div style="min-width: 200px; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px;">${event.title}</h3>
            <div style="font-size: 12px; color: ${color}; margin-bottom: 5px;">
                ● ${EVENT_TYPES[event.type]?.label || event.type}
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #555;">
                ${event.description || ''}
            </p>
            <div style="font-size: 11px; color: #777;">
                📍 ${event.city}, ${event.country}<br>
                📅 ${new Date(event.date).toLocaleDateString('ru-RU')}
                ${event.victims ? `<br>👥 Жертв: ${event.victims}` : ''}
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.bindTooltip(event.title.substring(0, 30) + '...', {
        direction: 'top',
        offset: [0, -10]
    });
    
    markers.push(marker);
}

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
}

// ============ ЛЕГЕНДА ============
function createLegend() {
    const legend = document.getElementById('legend');
    if (!legend) return;
    
    legend.innerHTML = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">Легенда</h4>';
    
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return;
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 5px 0; font-size: 12px;';
        item.innerHTML = `
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${config.color}; margin-right: 8px;"></span>
            <span>${config.label}</span>
        `;
        legend.appendChild(item);
    });
}

// ============ СПИСОК СОБЫТИЙ ============
function updateEventList(events) {
    const container = document.getElementById('events-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (events.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Нет событий</div>';
        return;
    }
    
    events.forEach(event => {
        const card = createEventCard(event);
        container.appendChild(card);
    });
}

function createEventCard(event) {
    const config = EVENT_TYPES[event.type] || EVENT_TYPES['другое'];
    
    const card = document.createElement('div');
    card.style.cssText = `
        padding: 12px;
        margin: 8px 0;
        background: #fff;
        border-radius: 6px;
        border-left: 3px solid ${config.color};
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 4px;">
            <span style="color: ${config.color}; font-weight: bold;">${config.label}</span>
            <span>${new Date(event.date).toLocaleDateString('ru-RU')}</span>
        </div>
        <div style="font-size: 13px; font-weight: 500; color: #333; margin-bottom: 4px;">
            ${event.title}
        </div>
        <div style="font-size: 11px; color: #666;">
            📍 ${event.city}, ${event.country}
            ${event.victims ? ` • 👥 ${event.victims}` : ''}
        </div>
    `;
    
    card.addEventListener('click', () => {
        map.setView([event.lat, event.lng], 10);
    });
    
    return card;
}

// ============ СТАТИСТИКА ============
function updateStats(events) {
    const container = document.getElementById('stats');
    if (!container) return;
    
    const total = events.length;
    const byType = {};
    events.forEach(e => byType[e.type] = (byType[e.type] || 0) + 1);
    
    let html = `<div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Всего: ${total}</div>`;
    
    Object.entries(byType).forEach(([type, count]) => {
        const config = EVENT_TYPES[type] || EVENT_TYPES['другое'];
        html += `
            <div style="display: flex; align-items: center; margin: 4px 0; font-size: 12px;">
                <span style="color: ${config.color}; margin-right: 5px;">●</span>
                <span style="flex: 1;">${config.label}:</span>
                <span style="font-weight: bold;">${count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
