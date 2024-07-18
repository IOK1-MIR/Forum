const mongoose = require('mongoose');

const subredditSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Subreddit = mongoose.model('Subreddit', subredditSchema);

module.exports = Subreddit;
