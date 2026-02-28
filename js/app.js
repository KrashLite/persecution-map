// app.js — Карта гонений на христиан (русская версия)

// ============ КОНФИГУРАЦИЯ ============
const CONFIG = {
    mapCenter: [20, 0],
    mapZoom: 2,
    maxEvents: 50
};

// ============ ТИПЫ СОБЫТИЙ (РУССКИЕ) ============
const EVENT_TYPES = {
    'убийство': { 
        color: '#e74c3c', 
        label: 'Убийства',
        icon: 'skull'
    },
    'нападение': { 
        color: '#e67e22', 
        label: 'Атаки',
        icon: 'fire'
    },
    'похищение': { 
        color: '#f39c12', 
        label: 'Похищения',
        icon: 'user-secret'
    },
    'арест': { 
        color: '#9b59b6', 
        label: 'Аресты',
        icon: 'handcuffs'
    },
    'дискриминация': { 
        color: '#3498db', 
        label: 'Дискриминация',
        icon: 'ban'
    },
    'другое': {
        color: '#95a5a6',
        label: 'Другое',
        icon: 'question'
    }
};

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let map;
let markers = [];
let eventsData = [];
let currentFilter = 'все';

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
        const response = await fetch('data/events.json');
        const data = await response.json();
        eventsData = data.events || [];
        console.log(`📊 Загружено событий: ${eventsData.length}`);
        
        // Проверяем типы данных
        const types = [...new Set(eventsData.map(e => e.type))];
        console.log('📋 Типы в данных:', types);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        eventsData = [];
    }
}

// ============ ФИЛЬТРЫ ============
function createFilterButtons() {
    const container = document.getElementById('filter-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Кнопка "Все"
    const allBtn = createFilterButton('все', 'Все', '#2c3e50', true);
    container.appendChild(allBtn);
    
    // Кнопки для каждого типа
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return; // Пропускаем "другое" или показываем по желанию
        const btn = createFilterButton(type, config.label, config.color, false);
        container.appendChild(btn);
    });
}

function createFilterButton(type, label, color, isActive) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.dataset.type = type;
    btn.textContent = label;
    btn.style.backgroundColor = isActive ? color : 'transparent';
    btn.style.borderColor = color;
    btn.style.color = isActive ? '#fff' : color;
    
    btn.addEventListener('click', () => {
        // Убираем active со всех кнопок
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
    
    // Фильтруем события
    const filtered = filterType === 'все' 
        ? eventsData 
        : eventsData.filter(e => e.type === filterType);
    
    console.log(`🔍 Фильтр: ${filterType}, найдено: ${filtered.length}`);
    
    // Добавляем маркеры
    filtered.forEach(event => {
        addMarker(event);
    });
    
    // Обновляем список
    updateEventList(filtered);
    
    // Обновляем статистику
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
    
    // Tooltip при наведении
    marker.bindTooltip(`${event.title}`, {
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
        <div class="event-popup">
            <h3>${event.title}</h3>
            <div class="event-meta">
                <span class="event-type" style="color: ${typeConfig.color}">
                    ● ${typeConfig.label}
                </span>
                <span class="event-date">${date}</span>
            </div>
            <p>${event.description || ''}</p>
            <div class="event-location">
                📍 ${event.city}, ${event.country}
            </div>
            ${event.victims ? `<div class="event-victims">👥 Жертв: ${event.victims}</div>` : ''}
            ${event.url ? `<a href="${event.url}" target="_blank" class="event-link">Источник →</a>` : ''}
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
    
    legend.innerHTML = '<h4>Легенда</h4>';
    
    Object.entries(EVENT_TYPES).forEach(([type, config]) => {
        if (type === 'другое') return;
        
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-color" style="background-color: ${config.color}"></span>
            <span class="legend-label">${config.label}</span>
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
        container.innerHTML = '<div class="no-events">Нет событий для отображения</div>';
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
    card.className = 'event-card';
    card.innerHTML = `
        <div class="event-card-header" style="border-left-color: ${typeConfig.color}">
            <span class="event-card-type" style="color: ${typeConfig.color}">
                ${typeConfig.label}
            </span>
            <span class="event-card-date">${date}</span>
        </div>
        <h4 class="event-card-title">${event.title}</h4>
        <p class="event-card-desc">${event.description || ''}</p>
        <div class="event-card-footer">
            <span>📍 ${event.city}, ${event.country}</span>
            ${event.victims ? `<span>👥 ${event.victims}</span>` : ''}
        </div>
    `;
    
    // Клик по карточке центрирует карту
    card.addEventListener('click', () => {
        map.setView([event.lat, event.lng], 10);
        // Находим маркер и открываем popup
        markers.forEach(m => {
            const latLng = m.getLatLng();
            if (Math.abs(latLng.lat - event.lat) < 0.001 && 
                Math.abs(latLng.lng - event.lng) < 0.001) {
                m.openPopup();
            }
        });
    });
    
    return card;
}

// ============ СТАТИСТИКА ============
function updateStats(events) {
    const statsContainer = document.getElementById('stats');
    if (!statsContainer) return;
    
    const total = events.length;
    const byType = {};
    
    events.forEach(e => {
        byType[e.type] = (byType[e.type] || 0) + 1;
    });
    
    let html = `<div class="stats-total">Всего: ${total}</div>`;
    
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const config = EVENT_TYPES[type] || EVENT_TYPES['другое'];
        html += `
            <div class="stats-item">
                <span style="color: ${config.color}">●</span>
                ${config.label}: ${count}
            </div>
        `;
    });
    
    statsContainer.innerHTML = html;
}

// ============ CSS СТИЛИ (добавьте в style.css) ============
/*
.filter-btn {
    padding: 8px 16px;
    margin: 4px;
    border: 2px solid;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
}

.filter-btn:hover {
    opacity: 0.8;
}

.event-popup {
    min-width: 250px;
    max-width: 300px;
}

.event-popup h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
}

.event-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 12px;
}

.event-card {
    padding: 15px;
    margin: 10px 0;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: transform 0.2s;
}

.event-card:hover {
    transform: translateX(5px);
}

.event-card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-left: 10px;
    border-left: 3px solid;
}

.legend-item {
    display: flex;
    align-items: center;
    margin: 5px 0;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 8px;
}
*/
