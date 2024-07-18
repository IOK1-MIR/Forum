const express = require('express');
const router = express.Router();
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');
const config = require('../config');
const { createUserIfNotExists, updateUserDetails } = require('../db/userOperations');
const Comment = require('../models/comment');
const Post = require('../models/post');
const Subreddit = require('../models/subreddit');
const User = require('../models/user');
const Vote = require('../models/vote');

router.use(auth(config));

router.get('/', requiresAuth(), async (req, res) => {
  try {
    const user = await createUserIfNotExists(req.oidc.user.sub);
    if (!user.isInitialSetupComplete) {
      return res.render('initialInfo', { auth0Id: req.oidc.user.sub });
    }

    const subreddits = await Subreddit.find();
    const posts = await Post.find().sort({ createdAt: -1 }).populate('subreddit').populate('userId');
    const previews = await Promise.all(posts.map(async post => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      const upvotes = await Vote.countDocuments({ itemId: post._id, voteType: 'upvote' });
      const downvotes = await Vote.countDocuments({ itemId: post._id, voteType: 'downvote' });
      return { 
        post: { 
          ...post._doc, 
          username: post.userId.name 
        }, 
        commentCount, 
        upvotes, 
        downvotes 
      };
    }));

    res.render('index', { previews, subreddits, user });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

// Function to create subreddit automatically
async function createDefaultSubreddit() {
  const subredditExists = await Subreddit.findOne({ name: 'ask' });
  if (!subredditExists) {
    const subreddit = new Subreddit({
      name: 'ask',
      description: 'Your first approach to this forum'
    });
    await subreddit.save();
    console.log('Default subreddit "ask" created.');
  } else {
    console.log('Default subreddit "ask" already exists.');
  }
}

// Call the function to create default subreddit
createDefaultSubreddit();

router.post('/complete-setup', requiresAuth(), async (req, res) => {
  const { name, auth0Id } = req.body;
  try {
    await updateUserDetails(auth0Id, name);
    res.redirect('/');
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/posts', requiresAuth(), async (req, res) => {
  const { title, content, subredditId } = req.body;
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });
    await new Post({ title, content, userId: user._id, subreddit: subredditId }).save();
    res.redirect('/');
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/post/:id', requiresAuth(), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('subreddit').populate('userId');
    const comments = await Comment.find({ postId: post._id }).sort({ createdAt: -1 }).populate('userId');
    
    const commentsWithVotes = await Promise.all(comments.map(async comment => {
      const { upvotes, downvotes } = await getVoteCounts(comment._id);
      return { ...comment._doc, username: comment.userId.name, upvotes, downvotes };
    }));

    const { upvotes, downvotes } = await getVoteCounts(post._id);
    res.render('post', { post, comments: commentsWithVotes, upvotes, downvotes });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/comments', requiresAuth(), async (req, res) => {
  const { content, postId } = req.body;
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });
    await new Comment({ content, userId: user._id, postId }).save();
    res.redirect(`/post/${postId}`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/votes', requiresAuth(), async (req, res) => {
  try {
    const { itemId, voteType } = req.body;
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });
    const result = await handleVote(user._id, itemId, voteType);
    res.json(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

async function handleVote(userId, itemId, voteType) {
  let vote = await Vote.findOne({ userId, itemId });
  if (vote) {
    vote.voteType === voteType ? await Vote.deleteOne({ _id: vote._id }) : (vote.voteType = voteType, await vote.save());
  } else {
    await new Vote({ userId, itemId, voteType }).save();
  }
  return getVoteCounts(itemId);
}

async function getVoteCounts(itemId) {
  const [upvotes, downvotes] = await Promise.all([
    Vote.countDocuments({ itemId, voteType: 'upvote' }),
    Vote.countDocuments({ itemId, voteType: 'downvote' })
  ]);
  return { upvotes, downvotes };
}

router.post('/subreddits', requiresAuth(), async (req, res) => {
  const { name, description } = req.body;
  try {
    await new Subreddit({ name, description }).save();
    res.redirect('/');
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/subreddit/:id', requiresAuth(), async (req, res) => {
  try {
    const subreddit = await Subreddit.findById(req.params.id);
    const posts = await Post.find({ subreddit: subreddit._id }).sort({ createdAt: -1 }).populate('userId');
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });

    const postsWithCommentCount = await Promise.all(posts.map(async post => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      return { ...post._doc, commentCount };
    }));

    res.render('subreddit', { subreddit, posts: postsWithCommentCount, user });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/profile', requiresAuth(), async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub }).populate('subscriptions');
    const posts = await Post.find({ userId: user._id }).sort({ createdAt: -1 }).populate('subreddit');
    const comments = await Comment.find({ userId: user._id }).sort({ createdAt: -1 }).populate('postId');
    
    // Obtener los votos para cada post
    const postsWithVotes = await Promise.all(posts.map(async post => {
      const upvotes = await Vote.countDocuments({ itemId: post._id, voteType: 'upvote' });
      const downvotes = await Vote.countDocuments({ itemId: post._id, voteType: 'downvote' });
      return { ...post._doc, upvotes, downvotes };
    }));

    // Obtener los votos para cada comentario
    const commentsWithVotes = await Promise.all(comments.map(async comment => {
      const upvotes = await Vote.countDocuments({ itemId: comment._id, voteType: 'upvote' });
      const downvotes = await Vote.countDocuments({ itemId: comment._id, voteType: 'downvote' });
      return { ...comment._doc, upvotes, downvotes };
    }));

    res.render('profile', {
      user,
      posts: postsWithVotes,
      comments: commentsWithVotes
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/subscribe', requiresAuth(), async (req, res) => {
  const { subredditId } = req.body;
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });
    const subreddit = await Subreddit.findById(subredditId);

    if (!user || !subreddit) {
      return res.status(404).send('User or Subreddit not found');
    }

    if (!user.subscriptions.includes(subredditId)) {
      user.subscriptions.push(subredditId);
      await user.save();
    }

    res.status(200).send('Subscribed successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/unsubscribe', requiresAuth(), async (req, res) => {
  const { subredditId } = req.body;
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.subscriptions = user.subscriptions.filter(id => id.toString() !== subredditId);
    await user.save();

    res.status(200).send('Unsubscribed successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;