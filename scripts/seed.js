require('dotenv').config();
const mongoose = require('mongoose');
const Synagogue = require('../models/Synagogue');
const database = require('../database.json');
const { hashPassword } = require('../lib/password');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to MongoDB');

        const existing = await Synagogue.findOne({ slug: 'novosibirsk' });
        if (existing) {
            console.log('Novosibirsk synagogue already exists, skipping seed.');
            process.exit(0);
        }

        const newSynagogue = new Synagogue({
            slug: 'novosibirsk',
            name: 'Novosibirsk Synagogue',
            adminPassword: await hashPassword('admin'),
            title: database.data.title,
            weeklyChapterEnabled: database.data.weeklyChapterEnabled,
            dailyCites: database.data.dailyCites,
            people: database.data.people,
            theme: {
                primaryColor: '#d4af37'
            },
            language: 'ru'
        });

        await newSynagogue.save();
        console.log('Seeded Novosibirsk Synagogue');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
