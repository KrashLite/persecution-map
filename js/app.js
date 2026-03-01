// app.js — Исправленная карта гонений на христиан

// ============ КОНФИГУРАЦИЯ ============
const CONFIG = {
    mapCenter: [20, 0],
    mapZoom: 2,
    maxEvents: 50,
    dataUrl: 'data/events.json'
};

// ============ ТИПЫ СОБЫТИЙ (АНГЛИЙСКИЕ КЛЮЧИ для совместимости с данными) ============
// Но отображаем на русском
const EVENT_TYPES = {
    'murder': { color: '#c0392b', label: 'Убийства' },      // Красный
    'attack': { color: '#e74c3c', label: 'Атаки' },         // Красно-оранжевый
    'kidnapping': { color: '#f39c12', label: 'Похищения' }, // Оранжевый
    'arrest': { color: '#8e44ad', label: 'Аресты' },        // Фиолетовый
    'discrimination': { color: '#3498db', label: 'Дискриминация' }, // Синий
    'other': { color: '#95a5a6', label: 'Другое' }          // Серый
};

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let map;
let markers = [];
let eventsData = [];
let currentFilter = 'all';

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚀 Инициализация карты...');
    initMap();
    await loadEvents();
    createFilterButtons();
    createLegend();
    applyFilter('all');
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
        
        // Проверяем структуру данных
        if (data.events && Array.isArray(data.events)) {
            eventsData = data.events;
            console.log(`✅ Загружено ${eventsData.length} событий из events.json`);
        } else if (Array.isArray(data)) {
            eventsData = data;
            console.log(`✅ Загружено ${eventsData.length} событий (массив)`);
        } else {
            throw new Error('Неверная структура данных');
        }
        
        // Проверяем типы событий
        const types = [...new Set(eventsData.map(e => e.type))];
        console.log('📋 Типы событий в данных:', types);
        
        // Проверяем, все ли типы известны
        types.forEach(type => {
            if (!EVENT_TYPES[type]) {
                console.warn(`⚠️ Неизвестный тип: "${type}" — будет использован цвет "другое"`);
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        console.log('🔄 Используем встроенный fallback...');
        
        eventsData = getInlineFallback();
        console.log(`✅ Используем встроенный fallback: ${eventsData.length} событий`);
    }
    
    // Нормализуем данные
    eventsData = eventsData.map(event => ({
        ...event,
        type: (event.type || 'other').toString().trim().toLowerCase(),
        lat: parseFloat(event.lat),
        lng: parseFloat(event.lng)
    }));
    
    console.log(`📊 Итого событий для отображения: ${eventsData.length}`);
}

// ============ ВСТРОЕННЫЙ FALLBACK ============
function getInlineFallback() {
    return [
        {
            date: "2026-02-28",
            lat: 9.0810,
            lng: 7.4895,
            country: "Нигерия",
            city: "Абуджа",
            type: "attack",
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
            type: "murder",
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
            type: "arrest",
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
            type: "attack",
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
            type: "discrimination",
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
    const allBtn = createFilterButton('all', 'Все', '#2c3e50', true);
    container.appendChild(allBtn);
    
    // Кнопки типов (используем английские ключи, но русские метки)
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'other') return;
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
        // Сброс активности всех кнопок
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
            const bType = b.dataset.type;
            const bColor = bType === 'all' ? '#2c3e50' : (EVENT_TYPES[bType]?.color || '#95a5a6');
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
    
    const filtered = filterType === 'all' 
        ? eventsData 
        : eventsData.filter(e => e.type === filterType);
    
    console.log(`🔍 Фильтр: "${filterType}", найдено: ${filtered.length}`);
    
    filtered.forEach(event => addMarker(event));
    updateEventList(filtered);
    updateStats(filtered);
}

// ============ МАРКЕРЫ ============
function addMarker(event) {
    const color = EVENT_TYPES[event.type]?.color || EVENT_TYPES['other'].color;
    const label = EVENT_TYPES[event.type]?.label || event.type;
    
    // Размер маркера зависит от количества жертв
    const radius = event.victims > 10 ? 12 : (event.victims > 0 ? 8 : 6);
    
    const marker = L.circleMarker([event.lat, event.lng], {
        radius: radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    const popupContent = `
        <div style="min-width: 250px; font-family: sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333; border-bottom: 2px solid ${color}; padding-bottom: 5px;">
                ${event.title}
            </h3>
            <div style="font-size: 13px; color: ${color}; margin-bottom: 8px; font-weight: bold;">
                ● ${label}
            </div>
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #555; line-height: 1.4;">
                ${event.description || ''}
            </p>
            <div style="font-size: 12px; color: #777; line-height: 1.6;">
                📍 ${event.city}, ${event.country}<br>
                📅 ${new Date(event.date).toLocaleDateString('ru-RU')}
                ${event.victims ? `<br>👥 Жертв: ${event.victims}` : ''}
                <br>🔗 Источник: ${event.source}
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.bindTooltip(event.title.substring(0, 40) + (event.title.length > 40 ? '...' : ''), {
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
    
    legend.innerHTML = '<h4 style="margin: 0 0 15px 0; font-size: 14px; color: #feca57;">Легенда</h4>';
    
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'other') return;
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 8px 0; font-size: 12px; color: #eaeaea;';
        item.innerHTML = `
            <span style="width: 12px; height: 12px; border-radius: 50%; background: ${config.color}; margin-right: 10px; box-shadow: 0 0 5px ${config.color};"></span>
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
        container.innerHTML = '<div style="padding: 30px; text-align: center; color: #888; font-style: italic;">Нет событий выбранного типа</div>';
        return;
    }
    
    events.forEach(event => {
        const card = createEventCard(event);
        container.appendChild(card);
    });
}

function createEventCard(event) {
    const config = EVENT_TYPES[event.type] || EVENT_TYPES['other'];
    
    const card = document.createElement('div');
    card.style.cssText = `
        padding: 15px;
        margin: 10px 0;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        border-left: 4px solid ${config.color};
        cursor: pointer;
        transition: all 0.3s;
        font-family: inherit;
    `;
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 6px;">
            <span style="color: ${config.color}; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
                ${config.label}
            </span>
            <span>${new Date(event.date).toLocaleDateString('ru-RU')}</span>
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 6px; line-height: 1.3;">
            ${event.title}
        </div>
        <div style="font-size: 12px; color: #aaa;">
            📍 ${event.city}, ${event.country}
            ${event.victims ? `<span style="color: #ff6b6b; margin-left: 10px;">● ${event.victims} жертв</span>` : ''}
        </div>
    `;
    
    card.addEventListener('mouseenter', () => {
        card.style.background = 'rgba(255,255,255,0.1)';
        card.style.transform = 'translateX(5px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.transform = 'translateX(0)';
    });
    
    card.addEventListener('click', () => {
        map.setView([event.lat, event.lng], 12);
        // Находим маркер и открываем попап
        const marker = markers.find(m => {
            const latLng = m.getLatLng();
            return Math.abs(latLng.lat - event.lat) < 0.001 && Math.abs(latLng.lng - event.lng) < 0.001;
        });
        if (marker) marker.openPopup();
    });
    
    return card;
}

// ============ СТАТИСТИКА ============
function updateStats(events) {
    const totalEl = document.getElementById('total-events');
    const countriesEl = document.getElementById('total-countries');
    const victimsEl = document.getElementById('total-victims');
    
    if (totalEl) totalEl.textContent = events.length;
    if (countriesEl) countriesEl.textContent = new Set(events.map(e => e.country)).size;
    if (victimsEl) victimsEl.textContent = events.reduce((sum, e) => sum + (e.victims || 0), 0);
    
    // Обновляем детальную статистику если есть контейнер
    const container = document.getElementById('stats');
    if (!container) return;
    
    const total = events.length;
    const byType = {};
    events.forEach(e => byType[e.type] = (byType[e.type] || 0) + 1);
    
    let html = `<div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #ff6b6b;">Всего: ${total}</div>`;
    
    Object.entries(byType).forEach(([type, count]) => {
        const cfg = EVENT_TYPES[type] || EVENT_TYPES['other'];
        html += `
            <div style="display: flex; align-items: center; margin: 6px 0; font-size: 13px; color: #ccc;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${cfg.color}; margin-right: 8px;"></span>
                <span style="flex: 1;">${cfg.label}:</span>
                <span style="font-weight: bold; color: #fff;">${count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
