require('dotenv').config();

const isAllowedTime = () => {
    const start = process.env.SEND_TIME_START || '09:00';
    const end = process.env.SEND_TIME_END || '21:00';

    const now = new Date();
    // تحويل الوقت الحالي لنص بصيغة HH:MM
    const current = now.toTimeString().substring(0, 5);

    return current >= start && current <= end;
};

// حساب عدد الميلي ثانية حتى الساعة 9 صباحاً من اليوم التالي
const getDelayUntilMorning = () => {
    const startHours = parseInt((process.env.SEND_TIME_START || '09:00').split(':')[0]);
    const now = new Date();
    let nextStart = new Date();
    nextStart.setHours(startHours, 0, 0, 0);

    if (now.getHours() >= startHours) {
        nextStart.setDate(nextStart.getDate() + 1);
    }

    return nextStart.getTime() - now.getTime();
};

module.exports = { isAllowedTime, getDelayUntilMorning };
