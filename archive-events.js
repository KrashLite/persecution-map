// archive-events.js — Управление архивом событий за год
const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'events-archive.json');

// Загрузить текущий архив
function loadArchive() {
    try {
        const data = fs.readFileSync(ARCHIVE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {
            metadata: {
                created: new Date().toISOString(),
                description: 'Архив событий гонений на христиан за последний год',
                lastUpdated: new Date().toISOString(),
                totalEvents: 0
            },
            events: []
        };
    }
}

// Загрузить текущие события (только что спарсенные)
function loadCurrentEvents() {
    try {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.events || [];
    } catch (e) {
        return [];
    }
}

// Сохранить архив
function saveArchive(archive) {
    archive.metadata.lastUpdated = new Date().toISOString();
    archive.metadata.totalEvents = archive.events.length;
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
    console.log(`💾 Архив сохранён: ${archive.events.length} событий`);
}

// Сохранить текущие события (для отображения на карте)
function saveCurrentEvents(events, archiveTotal) {
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString(),
            version: '3.1',
            totalEvents: events.length,
            archivedTotal: archiveTotal,
            updateMethod: 'ARCHIVE_SYSTEM',
            language: 'ru'
        },
        events: events
    };
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`💾 Текущие события сохранены: ${events.length} (из архива ${archiveTotal})`);
}

// Объединить события (дедупликация)
function mergeEvents(current, archived) {
    const all = [...archived, ...current];
    const seen = new Set();
    const unique = [];
    
    for (const event of all) {
        // Ключ дедупликации: URL + дата + заголовок
        const key = (event.url || '') + (event.date || '') + (event.title || '').substring(0, 30);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(event);
        }
    }
    
    return unique;
}

// Фильтр: только события не старше 1 года
function filterRecent(events) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate > oneYearAgo;
    });
}

// Основная функция
function archiveEvents() {
    console.log('📦 Управление архивом событий...\n');
    
    // Загружаем данные
    const currentEvents = loadCurrentEvents();
    const archive = loadArchive();
    
    console.log(`📥 Текущих событий (от парсера): ${currentEvents.length}`);
    console.log(`📚 Событий в архиве: ${archive.events.length}`);
    
    // Объединяем
    const merged = mergeEvents(currentEvents, archive.events);
    console.log(`🔗 После объединения: ${merged.length}`);
    
    // Удаляем старые (>1 года)
    const recent = filterRecent(merged);
    const removed = merged.length - recent.length;
    console.log(`🗑️ Удалено старых (>1 года): ${removed}`);
    console.log(`📊 Актуальных событий: ${recent.length}`);
    
    // Сортируем: новые первые
    recent.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Обновляем архив (все актуальные события)
    archive.events = recent;
    saveArchive(archive);
    
    // Берём последние 50 для отображения на карте
    const forDisplay = recent.slice(0, 50);
    saveCurrentEvents(forDisplay, recent.length);
    
    // Статистика по типам
    const byType = {};
    recent.forEach(e => byType[e.type] = (byType[e.type] || 0) + 1);
    console.log(`\n📈 Статистика по типам (всего):`);
    Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
    });
    
    // Статистика по странам (топ-5)
    const byCountry = {};
    recent.forEach(e => byCountry[e.country] = (byCountry[e.country] || 0) + 1);
    console.log(`\n🌍 Топ стран:`);
    Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([country, count]) => {
            console.log(`   ${country}: ${count}`);
        });
    
    console.log(`\n✅ Архив обновлён!`);
    console.log(`📁 Всего в архиве: ${recent.length}`);
    console.log(`🗺️ На карте: ${forDisplay.length}`);
}

archiveEvents();
