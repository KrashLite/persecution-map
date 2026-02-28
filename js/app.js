// js/app.js - полностью обновлённый файл

// Конфигурация
const CONFIG = {
    dataUrl: 'data/events.json',
    colors: {
        murder: '#c0392b',
        attack: '#e74c3c',
        kidnapping: '#f39c12',
        arrest: '#8e44ad',
        discrimination: '#3498db',
        other: '#95a5a6'
    }
};

let map;
let markers = [];
let allEvents = [];

// Инициализация
async function init() {
    initMap();
    await loadData();
}

function initMap() {
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
}

async function loadData() {
    try {
        const response = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
        const data = await response.json();
        allEvents = data.events || data;
        
        // Проверяем источник данных и показываем индикатор
        checkDataSource(data);
        
        renderEvents(allEvents);
        updateStats(allEvents);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        // Fallback данные
        allEvents = getFallbackData();
        renderEvents(allEvents);
        updateStats(allEvents);
        
        // Показываем индикатор ошибки
        showErrorIndicator();
    }
}

// ИНДИКАТОР ИСТОЧНИКА ДАННЫХ
function checkDataSource(data) {
    // Удаляем старый индикатор если есть
    const oldIndicator = document.getElementById('data-source-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    const metadata = data.metadata || {};
    const isRSS = metadata.rssSuccess === true;
    const updateMethod = metadata.updateMethod || 'UNKNOWN';
    const lastUpdated = metadata.lastUpdated ? new Date(metadata.lastUpdated).toLocaleString('ru-RU') : 'Неизвестно';
    const totalEvents = metadata.totalEvents || allEvents.length;
    
    const indicator = document.createElement('div');
    indicator.id = 'data-source-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'Segoe UI', sans-serif;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s ease;
        max-width: 300px;
        backdrop-filter: blur(10px);
        ${isRSS 
            ? 'background: rgba(39, 174, 96, 0.95); color: white; border: 1px solid rgba(255,255,255,0.2);' 
            : 'background: rgba(231, 76, 60, 0.95); color: white; border: 1px solid rgba(255,255,255,0.2);'}
    `;
    
    indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${isRSS ? '✅' : '⚠️'}</span>
            <strong>${isRSS ? 'RSS Active' : 'Fallback Data'}</strong>
        </div>
        <div style="font-size: 11px; opacity: 0.9; line-height: 1.4;">
            <div>Метод: ${updateMethod}</div>
            <div>Событий: ${totalEvents}</div>
            <div>Обновлено: ${lastUpdated}</div>
            ${!isRSS ? '<div style="margin-top: 4px; color: #ffeb3b;">⚡ Кликните для обновления</div>' : ''}
        </div>
    `;
    
    // При клике показываем детали
    indicator.onclick = () => {
        showDataDetails(metadata);
    };
    
    // Анимация появления
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(20px)';
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
    }, 100);
}

// Показать детали о данных
function showDataDetails(metadata) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        backdrop-filter: blur(5px);
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a2e;
        padding: 24px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        color: #eaeaea;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    const errors = metadata.errors || [];
    const errorsHtml = errors.length > 0 
        ? errors.map(e => `<li style="color: #e74c3c; margin: 4px 0;">${e.source}: ${e.error}</li>`).join('')
        : '<li style="color: #27ae60;">Нет ошибок</li>';
    
    content.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #feca57;">📊 Информация о данных</h3>
        <div style="line-height: 1.6; font-size: 14px;">
            <p><strong>Метод обновления:</strong> ${metadata.updateMethod || 'Unknown'}</p>
            <p><strong>RSS статус:</strong> ${metadata.rssSuccess ? '✅ Работает' : '❌ Не работает'}</p>
            <p><strong>Всего событий:</strong> ${metadata.totalEvents || allEvents.length}</p>
            <p><strong>Источников проверено:</strong> ${metadata.sourcesChecked || 0}</p>
            <p><strong>Рабочих источников:</strong> ${metadata.sourcesWorking || 0}</p>
            <p><strong>Последнее обновление:</strong> ${metadata.lastUpdated ? new Date(metadata.lastUpdated).toLocaleString('ru-RU') : 'Неизвестно'}</p>
            <p><strong>Версия:</strong> ${metadata.version || '1.0'}</p>
            
            <h4 style="color: #feca57; margin: 16px 0 8px 0;">Ошибки:</h4>
            <ul style="margin: 0; padding-left: 20px;">${errorsHtml}</ul>
        </div>
        <button onclick="this.closest('.modal').remove()" 
                style="margin-top: 16px; padding: 8px 16px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
            Закрыть
        </button>
    `;
    
    modal.className = 'modal';
    modal.appendChild(content);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
}

// Индикатор ошибки загрузки
function showErrorIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        z-index: 10000;
        background: rgba(231, 76, 60, 0.95);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
    `;
    indicator.innerHTML = '❌ Ошибка загрузки данных';
    document.body.appendChild(indicator);
}

function getFallbackData() {
    return [
        {date: "2026-02-28", lat: 9.0810, lng: 7.4895, country: "Nigeria", city: "Abuja", type: "attack", title: "Атака на церковь", victims: 12, source: "Open Doors"},
        {date: "2026-02-27", lat: 10.5105, lng: 7.4165, country: "Nigeria", city: "Кадуна", type: "kidnapping", title: "Похищение 23 христиан", victims: 23, source: "ICC"},
        {date: "2026-02-26", lat: 20.9517, lng: 85.0985, country: "India", city: "Одиша", type: "murder", title: "Убийство семьи", victims: 3, source: "ICC"},
        {date: "2026-02-25", lat: 35.6892, lng: 51.3890, country: "Iran", city: "Тегеран", type: "arrest", title: "Рейд на церковь", victims: 8, source: "Open Doors"},
        {date: "2026-02-24", lat: 15.3229, lng: 38.9251, country: "Eritrea", city: "Асмэра", type: "arrest", title: "Массовые аресты", victims: 30, source: "Open Doors"},
        {date: "2026-02-23", lat: -1.6585, lng: 29.2203, country: "DR Congo", city: "Киву", type: "attack", title: "Атака на деревню", victims: 15, source: "Open Doors"}
    ];
}

function renderEvents(events) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const listContainer = document.getElementById('events-list');
    listContainer.innerHTML = '';

    events.forEach((event, index) => {
        const color = CONFIG.colors[event.type] || CONFIG.colors.other;
        const marker = L.circleMarker([event.lat, event.lng], {
            radius: event.victims > 10 ? 10 : (event.victims > 0 ? 7 : 5),
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(map);

        const popup = `
            <div style="min-width: 250px;">
                <h3 style="color: ${color}; margin: 0 0 10px 0;">${event.title}</h3>
                <p><strong>📅</strong> ${formatDate(event.date)}</p>
                <p><strong>📍</strong> ${event.city}, ${event.country}</p>
                <p><strong>⚠️</strong> ${getTypeName(event.type)}</p>
                ${event.victims > 0 ? `<p><strong>💀</strong> ${event.victims} жертв</p>` : ''}
                <p style="font-size: 0.9em; color: #888; margin-top: 10px;">Источник: ${event.source}</p>
            </div>
        `;
        
        marker.bindPopup(popup);
        markers.push(marker);

        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.setProperty('--color', color);
        card.innerHTML = `
            <div class="event-date">${formatDate(event.date)}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-location">📍 ${event.city}, ${event.country}</div>
        `;
        card.onclick = () => {
            map.setView([event.lat, event.lng], 8);
            marker.openPopup();
        };
        listContainer.appendChild(card);
    });
}

function filterEvents(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(getTypeName(type)) || (type === 'all' && btn.textContent === 'Все')) {
            btn.classList.add('active');
        }
    });

    const filtered = type === 'all' ? allEvents : allEvents.filter(e => e.type === type);
    renderEvents(filtered);
    updateStats(filtered);
}

function updateStats(events) {
    document.getElementById('total-events').textContent = events.length;
    document.getElementById('total-countries').textContent = new Set(events.map(e => e.country)).size;
    document.getElementById('total-victims').textContent = events.reduce((sum, e) => sum + (e.victims || 0), 0);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTypeName(type) {
    const names = {
        murder: 'Убийство',
        attack: 'Атака',
        kidnapping: 'Похищение',
        arrest: 'Арест',
        discrimination: 'Дискриминация',
        other: 'Другое'
    };
    return names[type] || type;
}

// Запуск
window.addEventListener('load', init);
