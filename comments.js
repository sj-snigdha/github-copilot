// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Post comments to post id
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get all comments for post id
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment to array
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments for post id
  commentsByPostId[req.params.id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send success response
  res.status(201).send(commentsByPostId[req.params.id]);
});

// Receive events from event bus
app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type);

  // Get event data
  const { type, data } = req.body;

  // Update comments status
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;

    // Get comments for post id
    const comments = commentsByPostId[postId];

    // Find comment by id
    const comment = comments.find((comment) => comment.id === id);

    // Update comment status
    comment.status = status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        postId,
        status,
        content,
      },
    });
  }
});