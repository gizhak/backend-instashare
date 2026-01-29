import express from 'express';

import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { log } from '../../middlewares/logger.middleware.js';

import {
	getPosts,
	getPostById,
	addPost,
	updatePost,
	removePost,
	addPostComment,
	removePostComment,
} from './post.controller.js';

const router = express.Router();

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getPosts);
router.get('/:id', log, getPostById);
router.post('/', log, requireAuth, addPost);
router.put('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, removePost);
// router.delete('/:id', requireAuth, requireAdmin, removeCar)

router.post('/:id/comment', requireAuth, addPostComment);
router.delete('/:id/comment/:commentId', requireAuth, removePostComment);

export const postRoutes = router;
