// app.js — Карта гонений на христиан (универсальная версия с конвертером типов)

// ============ КОНФИГУРАЦИЯ ============
const CONFIG = {
    mapCenter: [20, 0],
    mapZoom: 2,
    maxEvents: 50,
    dataUrl: 'data/events.json'
};

// ============ ТИПЫ СОБЫТИЙ (РУССКИЕ — единый стандарт) ============
const EVENT_TYPES = {
    'убийство': { 
        color: '#e74c3c', 
        label: 'Убийства',
        filterLabel: 'Убийства'
    },
    'нападение': { 
        color: '#e67e22', 
        label: 'Атаки',
        filterLabel: 'Атаки'
    },
    'похищение': { 
        color: '#f39c12', 
        label: 'Похищения',
        filterLabel: 'Похищения'
    },
    'арест': { 
        color: '#9b59b6', 
        label: 'Аресты',
        filterLabel: 'Аресты'
    },
    'дискриминация': { 
        color: '#3498db', 
        label: 'Дискриминация',
        filterLabel: 'Дискриминация'
    },
    'другое': {
        color: '#95a5a6',
        label: 'Другое',
        filterLabel: 'Другое'
    }
};

// ============ КОНВЕРТЕР ТИПОВ (универсальный) ============
function normalizeEventType(type) {
    if (!type) return 'другое';
    
    const typeMap = {
        // Английские → русские
        'murder': 'убийство',
        'kill': 'убийство',
        'killed': 'убийство',
        'attack': 'нападение',
        'attacked': 'нападение',
        'kidnapping': 'похищение',
        'kidnap': 'похищение',
        'abduction': 'похищение',
        'arrest': 'арест',
        'arrested': 'арест',
        'detention': 'арест',
        'discrimination': 'дискриминация',
        'discriminated': 'дискриминация',
        'ban': 'дискриминация',
        'close': 'дискриминация',
        'other': 'другое',
        'unknown': 'другое',
        // Русские → русские (чтобы не сломать если уже русские)
        'убийство': 'убийство',
        'убийства': 'убийство',
        'нападение': 'нападение',
        'нападения': 'нападение',
        'похищение': 'похищение',
        'похищения': 'похищение',
        'арест': 'арест',
        'аресты': 'арест',
        'дискриминация': 'дискриминация',
        'дискриминации': 'дискриминация',
        'другое': 'другое',
        'другие': 'другое'
    };
    
    const normalized = typeMap[type.toString().toLowerCase().trim()];
    if (!normalized) {
        console.warn(`⚠️ Неизвестный тип: "${type}", используем 'другое'`);
        return 'другое';
    }
    return normalized;
}

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let map;
let markers = [];
let eventsData = [];
let currentFilter = 'все';

// ============ FALLBACK ДАННЫЕ (с английскими типами — конвертер исправит) ============
const FALLBACK_EVENTS = [
    {
        date: '2024-01-15',
        lat: 9.0820,
        lng: 8.6753,
        country: 'Нигерия',
        city: 'Абуджа',
        type: 'murder', // ← английский, конвертер исправит на 'убийство'
        title: 'Пастор убит в Нигерии',
        description: 'Вооруженные люди напали на церковь',
        source: 'Fallback',
        victims: 1
    },
    {
        date: '2024-01-14',
        lat: 20.5937,
        lng: 78.9629,
        country: 'Индия',
        city: 'Дели',
        type: 'attack', // ← английский, конвертер исправит на 'нападение'
        title: 'Атака на церковь в Индии',
        description: 'Толпа разрушила здание церкви',
        source: 'Fallback',
        victims: 0
    },
    {
        date: '2024-01-13',
        lat: 35.8617,
        lng: 104.1954,
        country: 'Китай',
        city: 'Пекин',
        type: 'arrest', // ← английский, конвертер исправит на 'арест'
        title: 'Арестованы христиане в Китае',
        description: 'Полиция задержала 5 верующих',
        source: 'Fallback',
        victims: 5
    },
    {
        date: '2024-01-12',
        lat: 30.3753,
        lng: 69.3451,
        country: 'Пакистан',
        city: 'Лахор',
        type: 'kidnapping', // ← английский, конвертер исправит на 'похищение'
        title: 'Похищена девушка-христианка',
        description: 'Насильно выдали замуж',
        source: 'Fallback',
        victims: 1
    },
    {
        date: '2024-01-11',
        lat: 38.9637,
        lng: 35.2433,
        country: 'Турция',
        city: 'Стамбул',
        type: 'discrimination', // ← английский, конвертер исправит на 'дискриминация'
        title: 'Церковь закрыта властями',
        description: 'Запрет на проведение богослужений',
        source: 'Fallback',
        victims: 0
    }
];

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
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
}

// ============ ЗАГРУЗКА ДАННЫХ ============
async function loadEvents() {
    try {
        const response = await fetch(CONFIG.dataUrl);
        const data = await response.json();
        
        // Берем события из файла или fallback
        const rawEvents = data.events || data || [];
        
        // Если пусто — используем fallback
        if (rawEvents.length === 0) {
            console.log('⚠️ Нет данных в файле, используем fallback');
            eventsData = processEvents(FALLBACK_EVENTS);
        } else {
            console.log(`📊 Загружено событий: ${rawEvents.length}`);
            eventsData = processEvents(rawEvents);
        }
        
        // Проверяем типы после конвертации
        const types = [...new Set(eventsData.map(e => e.type))];
        console.log('📋 Типы после конвертации:', types);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки, используем fallback:', error);
        eventsData = processEvents(FALLBACK_EVENTS);
    }
}

// ============ ОБРАБОТКА СОБЫТИЙ (конвертация типов) ============
function processEvents(events) {
    return events.map(event => ({
        ...event,
        type: normalizeEventType(event.type) // ← ЗДЕСЬ конвертируем тип
    }));
}

// ============ ФИЛЬТРЫ ============
function createFilterButtons() {
    const container = document.getElementById('filter-buttons');
    if (!container) {
        console.error('❌ Не найден контейнер #filter-buttons');
        return;
    }
    
    container.innerHTML = '';
    
    // Кнопка "Все"
    const allBtn = createFilterButton('все', 'Все', '#2c3e50', true);
    container.appendChild(allBtn);
    
    // Кнопки для каждого типа (кроме 'другое' — по желанию)
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return;
        const btn = createFilterButton(type, config.filterLabel, config.color, false);
        container.appendChild(btn);
    });
}

function createFilterButton(type, label, color, isActive) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.dataset.type = type;
    btn.textContent = label;
    
    // Стили
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
        // Сбрасываем все кнопки
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
            const bType = b.dataset.type;
            const bColor = bType === 'все' ? '#2c3e50' : EVENT_TYPES[bType]?.color || '#95a5a6';
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
    
    // Очищаем маркеры
    clearMarkers();
    
    // Фильтруем события (типы уже нормализованы!)
    const filtered = filterType === 'все' 
        ? eventsData 
        : eventsData.filter(e => e.type === filterType);
    
    console.log(`🔍 Фильтр: "${filterType}", найдено: ${filtered.length} событий`);
    
    // Добавляем маркеры
    filtered.forEach(event => {
        addMarker(event);
    });
    
    // Обновляем список и статистику
    updateEventList(filtered);
    updateStats(filtered);
}

// ============ МАРКЕРЫ ============
function addMarker(event) {
    const color = getEventColor(event.type);
    
    const marker = L.circleMarker([event.lat, event.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    // Popup
    const popupContent = createPopupContent(event);
    marker.bindPopup(popupContent);
    
    // Tooltip
    marker.bindTooltip(event.title.substring(0, 50) + '...', {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
    });
    
    markers.push(marker);
}

function createPopupContent(event) {
    const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES['другое'];
    const date = new Date(event.date).toLocaleDateString('ru-RU');
    
    return `
        <div style="min-width: 250px; max-width: 300px; font-family: sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">${event.title}</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                <span style="color: ${typeConfig.color}; font-weight: bold;">● ${typeConfig.label}</span>
                <span style="color: #666;">${date}</span>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #555; line-height: 1.4;">
                ${event.description || 'Нет описания'}
            </p>
            <div style="font-size: 12px; color: #777; margin-bottom: 5px;">
                📍 ${event.city}, ${event.country}
            </div>
            ${event.victims ? `<div style="font-size: 12px; color: #e74c3c; margin-bottom: 5px;">👥 Жертв: ${event.victims}</div>` : ''}
            ${event.url ? `<a href="${event.url}" target="_blank" style="font-size: 12px; color: #3498db;">Источник →</a>` : ''}
        </div>
    `;
}

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
}

// ============ ЦВЕТА ============
function getEventColor(type) {
    return EVENT_TYPES[type]?.color || EVENT_TYPES['другое'].color;
}

// ============ ЛЕГЕНДА ============
function createLegend() {
    const legend = document.getElementById('legend');
    if (!legend) return;
    
    legend.innerHTML = '<h4 style="margin: 0 0 10px 0;">Легенда</h4>';
    
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return;
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 5px 0; font-size: 13px;';
        item.innerHTML = `
            <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${config.color}; margin-right: 8px;"></span>
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
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Нет событий для отображения</div>';
        return;
    }
    
    events.slice(0, CONFIG.maxEvents).forEach(event => {
        const card = createEventCard(event);
        container.appendChild(card);
    });
}

function createEventCard(event) {
    const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES['другое'];
    const date = new Date(event.date).toLocaleDateString('ru-RU');
    
    const card = document.createElement('div');
    card.style.cssText = `
        padding: 15px;
        margin: 10px 0;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        border-left: 4px solid ${typeConfig.color};
    `;
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
            <span style="color: ${typeConfig.color}; font-weight: bold;">${typeConfig.label}</span>
            <span style="color: #999;">${date}</span>
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 15px; color: #333;">${event.title}</h4>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #666; line-height: 1.4;">
            ${event.description ? event.description.substring(0, 100) + '...' : ''}
        </p>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #888;">
            <span>📍 ${event.city}, ${event.country}</span>
            ${event.victims ? `<span style="color: #e74c3c;">👥 ${event.victims}</span>` : ''}
        </div>
    `;
    
    // Клик по карточке — центрируем карту
    card.addEventListener('click', () => {
        map.setView([event.lat, event.lng], 10);
        // Ищем маркер и открываем popup
        markers.forEach(m => {
            const latLng = m.getLatLng();
            if (Math.abs(latLng.lat - event.lat) < 0.001 && Math.abs(latLng.lng - event.lng) < 0.001) {
                m.openPopup();
            }
        });
    });
    
    // Эффекты наведения
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateX(5px)';
        card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateX(0)';
        card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    return card;
}

// ============ СТАТИСТИКА ============
function updateStats(events) {
    const container = document.getElementById('stats');
    if (!container) return;
    
    const total = events.length;
    const byType = {};
    
    events.forEach(e => {
        byType[e.type] = (byType[e.type] || 0) + 1;
    });
    
    let html = `<div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333;">Всего: ${total}</div>`;
    
    Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const config = EVENT_TYPES[type] || EVENT_TYPES['другое'];
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            html += `
                <div style="display: flex; align-items: center; margin: 5px 0; font-size: 13px;">
                    <span style="color: ${config.color}; margin-right: 5px;">●</span>
                    <span style="flex: 1;">${config.label}:</span>
                    <span style="font-weight: bold;">${count}</span>
                    <span style="color: #999; margin-left: 5px; font-size: 11px;">(${percent}%)</span>
                </div>
            `;
        });
    
    container.innerHTML = html;
}
