const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const cron = require('node-cron');

// وظيفة تعمل كل يوم في منتصف الليل
cron.schedule('0 0 * * *', async () => {
    console.log("start checkSubUser");
    
    try {
        // جلب جميع المستخدمين الذين انتهت صلاحية اشتراكهم
        const expiredUsers = await User.find({ subscriptionEndDate: { $lte: new Date() } });

        for (const user of expiredUsers) {
            console.log(`User ${user.username} has expired subscription`);
            
            // يمكنك أيضًا تحديث حالة الحساب في قاعدة البيانات
            user.mood = "basic";
            user.subscriptionEndDate = null;
            await user.save();
        }

        console.log("done checkSubUser");
    } catch (error) {
        console.error("Error in checkSubUser:", error);
    }
}, {
    timezone: "Africa/Cairo" // ضبط التوقيت حسب منطقتك
});



module.exports = cron