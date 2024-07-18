const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    voteType: {
        type: String,
        enum: ['upvote', 'downvote'],
        required: true
    }
}, {
    timestamps: true
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
