const validateToken = (req, res, next) => {
    const token = req.headers['authorization'] || req.headers['x-api-token'];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '🔒 رمز التفويض مطلوب'
        });
    }
    
    const expectedToken = process.env.API_TOKEN;
    
    // دعم Bearer Token أو Token مباشر
    const cleanToken = token.replace('Bearer ', '');
    
    if (cleanToken !== expectedToken) {
        return res.status(403).json({
            success: false,
            message: '❌ رمز تفويض غير صالح'
        });
    }
    
    next();
};

module.exports = { validateToken };
