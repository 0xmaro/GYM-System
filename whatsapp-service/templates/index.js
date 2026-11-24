module.exports = {
    welcome: (v) => `أهلاً وسهلاً ${v.name} 💪\nتم تسجيلك في ${v.gym_name}!\n\n📋 اشتراكك: ${v.subscription_type}\n📅 ينتهي: ${v.end_date}\n🏋️ الحصص المتبقية: ${v.sessions_count}\n\nكارت الدخول مرفق 👇`,

    expiry_reminder: (v) => `تنبيه هام 🔔\n\nعزيزي ${v.name}\nاشتراكك (${v.subscription_type}) سينتهي خلال ${v.days_remaining} أيام!\n\n📅 تاريخ الانتهاء: ${v.end_date}\n\nللتجديد تواصل معنا الآن ⚡`,

    sessions_empty: (v) => `تنبيه الحصص ⚡\n\nأخ ${v.name}\nهذه كانت آخر حصة في اشتراكك!\nالحصص المتبقية: 0 🚫\n\nلتجديد الاشتراك وتجنب التوقف، تواصل معنا الآن 📞`,

    debt_reminder: (v) => `تذكير مالي 📌\n\nأخ ${v.name}\nيوجد مبلغ مستحق عليك بقيمة:\n💵 ${v.amount_display}\n\nالتفاصيل: ${v.reason}\nتاريخ الاستحقاق: ${v.due_date}\n\nيرجى التسوية في أقرب وقت 🙏`,

    receipt: (v) => `إيصال استلام نقدية 🧾\n\nأخ ${v.name}\nتم تسجيل الدفعة بنجاح.\n\nالاشتراك: ${v.subscription_type}\nالمبلغ المدفوع: ${v.amount_display}\nالتاريخ: ${v.date}\nرقم الإيصال: ${v.receipt_number}\n\nشكراً لثقتك بنا 💪`,

    freeze_notification: (v) => `إشعار تجميد ❄️\n\nعزيزي ${v.name}\nتم تجميد اشتراكك بنجاح حتى تاريخ: ${v.frozen_until}\n\n📅 تاريخ الانتهاء الجديد: ${v.new_end_date}\n\nنتمنى لك عودة قوية قريباً! 💪`
};
