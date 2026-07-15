const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({

    role: String,

    content: String,

    createdAt: {

        type: Date,

        default: Date.now

    }

});

const conversationSchema = new mongoose.Schema({

    user: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User"

    },

    title: {

        type: String,

        default: "New Chat"

    },

    messages: [messageSchema]

},
{
    timestamps:true
});

module.exports =
mongoose.model(
    "Conversation",
    conversationSchema
);