const express = require('express');
const axios = require('axios');
const app = express();


app.use(express.json());


app.get('/products', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3001/products');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3001/products/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: error.response?.data?.message || 'Error fetching product' });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3002/orders', req.body);
        res.status(201).json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error creating order' });
    }
});

app.listen(3000, () => {
    console.log('API Gateway running on port 3000');
});