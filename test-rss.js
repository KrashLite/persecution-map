// test-rss.js - для локальной проверки
const updateData = require('./js/update-data.js');

console.log('🧪 Запуск локального теста RSS...\n');

updateData.updateData().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('ТЕСТ ЗАВЕРШЁН');
    console.log('='.repeat(50));
    console.log('RSS Success:', result.metadata.rssSuccess);
    console.log('Update Method:', result.metadata.updateMethod);
    console.log('Total Events:', result.events.length);
    
    if (result.metadata.rssSuccess) {
        console.log('✅ RSS РАБОТАЕТ!');
    } else {
        console.log('⚠️ RSS НЕ РАБОТАЕТ, используется fallback');
    }
}).catch(err => {
    console.error('❌ Ошибка:', err);
});
