const express = require('express');
const axios = require('axios');
const app = express();
const rateLimit = require('express-rate-limit');
const path = require('path');
const DATA = require('./constant');
const chalk = require('chalk');
const CircuitBreaker = require('opossum');

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.json());

//TODO: API Product service
async function fetchProductById(id) {
    const response = await axios.get(`http://localhost:3001/products/${id}`);
    return response.data;
}

//TODO: circuit breaker
const breaker = new CircuitBreaker(fetchProductById, {
    timeout: 3000,                  // Thời gian tối đa chờ phản hồi
    errorThresholdPercentage: 50,  // Nếu 50% request lỗi => mở mạch
    resetTimeout: 10000            // Sau 10s thử lại
});

//TODO: Log trạng thái circuit breaker
breaker.on('open', () => {
    console.log(chalk.redBright('Circuit breaker OPENED: Tạm ngưng gửi request'));
});

breaker.on('halfOpen', () => {
    console.log(chalk.yellow('Circuit breaker HALF-OPEN: Đang thử lại kết nối'));
});

breaker.on('close', () => {
    console.log(chalk.greenBright('Circuit breaker CLOSED: Đã khôi phục kết nối'));
});

breaker.on('failure', error => {
    console.log(chalk.red(` Request thất bại: ${error.message}`));
});

breaker.on('reject', () => {
    console.log(chalk.magenta(' Yêu cầu bị từ chối do circuit breaker đang mở'));
});

async function withRetry(id, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const data = await breaker.fire(id);
            return data;
        } catch (err) {
            console.log(chalk.yellow(`Retry lần ${i + 1} thất bại: ${err.message}`));
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

//TODO: Handle limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.'
});

app.use(limiter);

app.get('/products', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3001/products');
        console.log(chalk.cyan('Lấy danh sách sản phẩm thành công'));
        res.json(response.data);
    } catch (error) {
        console.error(chalk.red(' Lỗi lấy danh sách sản phẩm:'), error.message);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const data = await withRetry(req.params.id);
        console.log(chalk.cyan(` Lấy sản phẩm ID=${req.params.id} thành công`));
        res.json(data);
    } catch (error) {
        console.error(chalk.red(` Lỗi lấy sản phẩm ID=${req.params.id}:`), error.message);
        res.status(error.response?.status || 503).json({
            message: error.response?.data?.message || 'Lỗi server hoặc circuit breaker đang mở'
        });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3002/orders', req.body);
        console.log(chalk.green('Tạo đơn hàng thành công'));
        res.status(201).json(response.data);
    } catch (error) {
        console.error(chalk.red(' Lỗi tạo đơn hàng:'), error.message);
        res.status(500).json({ message: 'Error creating order' });
    }
});

app.get('/home', (_, res) => {
    console.log(chalk.blue(' Truy cập trang Home'));
    return res.render('index');
});

app.get('/blogs', async (_, res) => {
    try {
        console.log(chalk.cyan(' Lấy danh sách blog thành công'));
        res.status(200).json(DATA);
    } catch (error) {
        console.error(chalk.red('Lỗi lấy blog:'), error.message);
        res.status(500).json(error);
    }
});

app.listen(3000, () => {
    console.log(chalk.greenBright('🚀 API Gateway đang chạy tại cổng 3000'));
});
