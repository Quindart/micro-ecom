const express = require('express');
const amqp = require('amqplib');
const app = express();

app.use(express.json());

app.post('/orders', async (req, res) => {
    const { productId, quantity } = req.body;

    const order = { id: Date.now(), productId, quantity, status: 'created' };
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queue = 'order_queue';

        await channel.assertQueue(queue, { durable: false });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)));
        console.log('Order sent to queue:', order);

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing to RabbitMQ:', error);
    }

    res.status(201).json(order);
});

app.listen(3002, () => {
    console.log('Order Service running on port 3002');
});